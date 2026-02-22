<?php

namespace App\Http\Controllers\Calendar;

use App\Http\Controllers\Controller;
use App\Models\Calendar\Event;
use App\Notifications\CalendarEventNotification;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * CalendarController
 * - Manual calendar events CRUD (company-scoped)
 * - Done toggle (TODO/REMINDER only)
 * - Reminder settings (in-app + email)
 * - Enforces predefined color palettes server-side
 */
class CalendarController extends Controller
{
    /**
     * Predefined colors (server-enforced).
     * Frontend should only send these values.
     */
    private const COLOR_PRESETS = [
        '#2ECC71', // green
        '#3498DB', // blue
        '#9B59B6', // purple
        '#E67E22', // orange
        '#E74C3C', // red
        '#95A5A6', // gray
    ];

    private const CATEGORIES = ['TODO', 'REMINDER', 'HOLIDAY'];

    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    private function companyId(Request $request): int
    {
        return (int) $request->user()->company_id;
    }

    private function companyUsersQuery(Request $request)
    {
        return \App\Models\User::query()
            ->where('company_id', $this->companyId($request))
            ->where('is_active', 1);
    }

    private function assertSameCompany(Request $request, Event $event): void
    {
        if ((int) $event->company_id !== $this->companyId($request)) {
            abort(404);
        }
    }

    private function computeRemindAt(?int $minutesBefore, $start): ?Carbon
    {
        if ($minutesBefore === null) return null;
        if ($minutesBefore < 0) return null;

        $startAt = $start instanceof Carbon ? $start : Carbon::parse($start);
        return $startAt->copy()->subMinutes($minutesBefore);
    }

    private function notifyCompany(Request $request, string $action, Event $event): void
    {
        $users = $this->companyUsersQuery($request)->get();
        foreach ($users as $user) {
            $user->notify(new CalendarEventNotification($action, $event));
        }
    }

    /**
     * List company manual events (optionally by range)
     * NOTE: This controller is for manual calendar events only.
     * For merged feed (leave/offdays/awol/company announcements), use CalendarFeedController.
     */
    public function index(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);

        $query = Event::query()->where('company_id', $companyId);

        // Optional range (use overlap, not strict between)
        if ($request->filled('start') && $request->filled('end')) {
            $start = Carbon::parse($request->input('start'))->startOfDay();
            $end   = Carbon::parse($request->input('end'))->endOfDay();

            $query->where(function ($q) use ($start, $end) {
                $q->whereBetween('start', [$start, $end])
                  ->orWhereBetween('end', [$start, $end])
                  ->orWhere(function ($qq) use ($start, $end) {
                      $qq->where('start', '<=', $start)
                         ->where(function ($qqq) use ($end) {
                             $qqq->whereNull('end')->orWhere('end', '>=', $end);
                         });
                  });
            });
        } elseif ($request->filled('start')) {
            $query->where('start', '>=', $request->input('start'));
        } elseif ($request->filled('end')) {
            // if end exists, filter by end <= end; if end null, include if start <= end
            $end = Carbon::parse($request->input('end'))->endOfDay();
            $query->where(function ($q) use ($end) {
                $q->whereNotNull('end')->where('end', '<=', $end)
                  ->orWhere(function ($qq) use ($end) {
                      $qq->whereNull('end')->where('start', '<=', $end);
                  });
            });
        }

        $events = $query->orderBy('start')->get();

        return response()->json(['ok' => true, 'data' => $events], 200);
    }

    /**
     * Store a new manual event + notify org users
     */
    public function store(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);

        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'start'       => ['required', 'date'],
            'end'         => ['nullable', 'date', 'after_or_equal:start'],
            'category'    => ['nullable', 'string', Rule::in(self::CATEGORIES)],
            'all_day'     => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
            'location'    => ['nullable', 'string', 'max:255'],

            // Enforce presets only (or null => backend will choose default by category)
            'color'       => ['nullable', 'string', Rule::in(self::COLOR_PRESETS)],

            // Reminder config (optional)
            'reminder_minutes_before' => ['nullable', 'integer', 'min:0', 'max:10080'], // up to 7 days
            'remind_in_app' => ['sometimes', 'boolean'],
            'remind_email'  => ['sometimes', 'boolean'],

            // Done state allowed only for TODO/REMINDER; validated later
            'is_done' => ['sometimes', 'boolean'],
        ]);

        $category = $data['category'] ?? 'REMINDER';

        // Robust rule: if not all_day, end should exist
        $allDay = (bool) ($data['all_day'] ?? false);
        if (!$allDay && empty($data['end'])) {
            return response()->json(['ok' => false, 'message' => 'Timed events must have an end date/time.'], 422);
        }

        // Done rules
        $isDone = (bool) ($data['is_done'] ?? false);
        if ($isDone && !in_array($category, ['TODO', 'REMINDER'], true)) {
            return response()->json(['ok' => false, 'message' => 'Only TODO/REMINDER events can be marked done.'], 422);
        }

        // Default color by category if not provided
        $defaultColor = $category === 'TODO' ? '#3498DB' : ($category === 'HOLIDAY' ? '#E74C3C' : '#2ECC71');
        $color = $data['color'] ?? $defaultColor;

        $reminderMinutes = array_key_exists('reminder_minutes_before', $data)
            ? ($data['reminder_minutes_before'] === null ? null : (int)$data['reminder_minutes_before'])
            : null;

        $remindAt = $isDone ? null : $this->computeRemindAt($reminderMinutes, $data['start']);

        $event = DB::transaction(function () use ($request, $companyId, $data, $category, $allDay, $color, $isDone, $reminderMinutes, $remindAt) {
            return Event::create([
                'company_id'  => $companyId,
                // user_id optional: null => company-wide, set => personal
                'user_id'     => $data['user_id'] ?? null, // only if your table has it and you want it
                'title'       => $data['title'],
                'description' => $data['description'] ?? null,
                'location'    => $data['location'] ?? null,
                'category'    => $category,
                'start'       => $data['start'],
                'end'         => $data['end'] ?? null,
                'all_day'     => $allDay,
                'color'       => $color,

                // Done fields
                'is_done'     => $isDone,
                'done_at'     => $isDone ? now() : null,
                'done_by'     => $isDone ? $request->user()->id : null,

                // Reminder fields
                'reminder_minutes_before' => $reminderMinutes,
                'remind_at'               => $remindAt,
                'reminded_at'             => null,
                'remind_in_app'           => (bool)($data['remind_in_app'] ?? true),
                'remind_email'            => (bool)($data['remind_email'] ?? false),

                'created_by'  => $request->user()->id,
                'updated_by'  => $request->user()->id,
            ]);
        });

        $this->notifyCompany($request, 'created', $event);

        return response()->json(['ok' => true, 'message' => 'Event created', 'data' => $event], 201);
    }

    /**
     * Show a single event (org scoped)
     */
    public function show(Request $request, Event $event): JsonResponse
    {
        $this->assertSameCompany($request, $event);
        return response()->json(['ok' => true, 'data' => $event], 200);
    }

    /**
     * Update an event + notify org users
     */
    public function update(Request $request, Event $event): JsonResponse
    {
        $this->assertSameCompany($request, $event);

        $data = $request->validate([
            'title'       => ['sometimes', 'required', 'string', 'max:255'],
            'start'       => ['sometimes', 'required', 'date'],
            'end'         => ['nullable', 'date'],
            'category'    => ['sometimes', 'nullable', 'string', Rule::in(self::CATEGORIES)],
            'all_day'     => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
            'location'    => ['nullable', 'string', 'max:255'],
            'color'       => ['nullable', 'string', Rule::in(self::COLOR_PRESETS)],

            'reminder_minutes_before' => ['nullable', 'integer', 'min:0', 'max:10080'],
            'remind_in_app' => ['sometimes', 'boolean'],
            'remind_email'  => ['sometimes', 'boolean'],

            'is_done' => ['sometimes', 'boolean'],
        ]);

        $start = $data['start'] ?? $event->start;
        $end   = array_key_exists('end', $data) ? $data['end'] : $event->end;

        if ($end && strtotime($end) < strtotime($start)) {
            return response()->json(['ok' => false, 'message' => 'The end must be after or equal to start.'], 422);
        }

        $allDay = array_key_exists('all_day', $data) ? (bool)$data['all_day'] : (bool)$event->all_day;
        if (!$allDay && empty($end)) {
            return response()->json(['ok' => false, 'message' => 'Timed events must have an end date/time.'], 422);
        }

        $category = array_key_exists('category', $data) ? ($data['category'] ?? 'REMINDER') : ($event->category ?? 'REMINDER');

        // Done rules
        $isDone = array_key_exists('is_done', $data) ? (bool)$data['is_done'] : (bool)$event->is_done;
        if ($isDone && !in_array($category, ['TODO', 'REMINDER'], true)) {
            return response()->json(['ok' => false, 'message' => 'Only TODO/REMINDER events can be marked done.'], 422);
        }

        // Color default if category changed and no explicit color provided
        $defaultColor = $category === 'TODO' ? '#3498DB' : ($category === 'HOLIDAY' ? '#E74C3C' : '#2ECC71');
        $color = array_key_exists('color', $data)
            ? ($data['color'] ?? $defaultColor)
            : ($event->color ?? $defaultColor);

        // Reminder compute
        $reminderMinutes = array_key_exists('reminder_minutes_before', $data)
            ? ($data['reminder_minutes_before'] === null ? null : (int)$data['reminder_minutes_before'])
            : ($event->reminder_minutes_before ?? null);

        $remindAt = $isDone ? null : $this->computeRemindAt($reminderMinutes, $start);

        $payload = [
            'updated_by'  => $request->user()->id,

            // standard fields
            'category'    => $category,
            'start'       => $start,
            'end'         => $end,
            'all_day'     => $allDay,
            'color'       => $color,
        ];

        // only override if provided (keeps PATCH-like behavior)
        foreach (['title','description','location'] as $f) {
            if (array_key_exists($f, $data)) $payload[$f] = $data[$f];
        }

        // done fields
        if (array_key_exists('is_done', $data)) {
            $payload['is_done'] = $isDone;
            $payload['done_at'] = $isDone ? now() : null;
            $payload['done_by'] = $isDone ? $request->user()->id : null;

            // when marking done, you typically stop reminders
            if ($isDone) {
                $payload['remind_at'] = null;
                // keep reminded_at as-is, or set it:
                // $payload['reminded_at'] = $event->reminded_at ?? now();
            }
        }

        // reminder fields
        if (array_key_exists('reminder_minutes_before', $data)) {
            $payload['reminder_minutes_before'] = $reminderMinutes;
            $payload['remind_at'] = $remindAt;
            // changing reminder should allow re-send in future
            $payload['reminded_at'] = null;
        }
        if (array_key_exists('remind_in_app', $data)) $payload['remind_in_app'] = (bool)$data['remind_in_app'];
        if (array_key_exists('remind_email', $data))  $payload['remind_email']  = (bool)$data['remind_email'];

        $event->update($payload);

        $this->notifyCompany($request, 'updated', $event);

        return response()->json(['ok' => true, 'message' => 'Event updated', 'data' => $event], 200);
    }

    /**
     * Delete an event + notify org users
     */
    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->assertSameCompany($request, $event);

        $eventTitle = $event->title;
        $event->delete();

        // lightweight payload for notification after deletion
        $event->title = $eventTitle;

        $this->notifyCompany($request, 'deleted', $event);

        return response()->json(['ok' => true, 'message' => 'Event deleted'], 200);
    }

    /**
     * Drag/drop event move endpoint
     */
    public function move(Request $request, Event $event): JsonResponse
    {
        $this->assertSameCompany($request, $event);

        $data = $request->validate([
            'start'   => ['required', 'date'],
            'end'     => ['nullable', 'date', 'after_or_equal:start'],
            'all_day' => ['sometimes', 'boolean'],
        ]);

        $allDay = array_key_exists('all_day', $data) ? (bool)$data['all_day'] : (bool)$event->all_day;
        $end = $data['end'] ?? $event->end;

        if (!$allDay && empty($end)) {
            return response()->json(['ok' => false, 'message' => 'Timed events must have an end date/time.'], 422);
        }

        // If event has reminders and is not done, recompute remind_at (if minutes set)
        $remindAt = null;
        if (!(bool)$event->is_done && $event->reminder_minutes_before !== null) {
            $remindAt = $this->computeRemindAt((int)$event->reminder_minutes_before, $data['start']);
        }

        $event->update([
            'start' => $data['start'],
            'end' => $end,
            'all_day' => $allDay,
            'updated_by' => $request->user()->id,

            'remind_at' => $remindAt,
            'reminded_at' => null, // allow re-remind after movement
        ]);

        return response()->json(['ok' => true, 'message' => 'Event moved', 'data' => $event], 200);
    }

    /**
     * Resize endpoint (end changes)
     */
    public function resize(Request $request, Event $event): JsonResponse
    {
        $this->assertSameCompany($request, $event);

        $data = $request->validate([
            'end' => ['required', 'date', 'after_or_equal:' . $event->start],
        ]);

        if (!(bool)$event->all_day && empty($data['end'])) {
            return response()->json(['ok' => false, 'message' => 'Timed events must have an end date/time.'], 422);
        }

        $event->update([
            'end' => $data['end'],
            'updated_by' => $request->user()->id,
        ]);

        return response()->json(['ok' => true, 'message' => 'Event resized', 'data' => $event], 200);
    }

    /**
     * Mark manual TODO/REMINDER events as done/undone
     * Route: PATCH /calendar/events/{event}/done
     */
    public function toggleDone(Request $request, Event $event): JsonResponse
    {
        $this->assertSameCompany($request, $event);

        $data = $request->validate([
            'is_done' => ['required', 'boolean'],
        ]);

        $category = $event->category ?? 'REMINDER';
        if (!in_array($category, ['TODO', 'REMINDER'], true)) {
            return response()->json(['ok' => false, 'message' => 'Only TODO/REMINDER events can be marked done.'], 422);
        }

        $isDone = (bool)$data['is_done'];

        $event->update([
            'is_done' => $isDone,
            'done_at' => $isDone ? now() : null,
            'done_by' => $isDone ? $request->user()->id : null,

            // stop reminders when done; restore computed remind_at when undone
            'remind_at' => $isDone
                ? null
                : $this->computeRemindAt($event->reminder_minutes_before, $event->start),

            'reminded_at' => $isDone ? ($event->reminded_at ?? now()) : null,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json(['ok' => true, 'message' => $isDone ? 'Marked done' : 'Marked not done', 'data' => $event], 200);
    }

    public function sync(Request $request): JsonResponse
    {
        return response()->json(['ok' => false, 'message' => 'Sync not implemented'], 501);
    }
}
