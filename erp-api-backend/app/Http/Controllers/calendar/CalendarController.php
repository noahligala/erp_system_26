<?php

namespace App\Http\Controllers\Calendar;

use App\Http\Controllers\Controller;
use App\Models\Calendar\Event;
use App\Notifications\CalendarEventNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * @method void middleware($middleware, array $options = [])
 */
class CalendarController extends Controller
{
    public function __construct()
    {
        // Your API uses sanctum
        $this->middleware('auth:sanctum');
    }

    private function companyId(Request $request): int
    {
        // adjust if you use organization_id instead
        return (int) $request->user()->company_id;
    }

    private function companyUsersQuery(Request $request)
    {
        return \App\Models\User::query()
            ->where('company_id', $this->companyId($request))
            ->where('is_active', 1); // remove if not present
    }

    private function assertSameCompany(Request $request, Event $event): void
    {
        if ((int) $event->company_id !== $this->companyId($request)) {
            abort(404); // don’t leak existence
        }
    }

    /**
     * List company events (optionally by range)
     */
    public function index(Request $request): JsonResponse
    {

        $companyId = $this->companyId($request);

        $query = Event::query()->where('company_id', $companyId);

        if ($request->filled('start')) {
            $query->where('start', '>=', $request->input('start'));
        }
        if ($request->filled('end')) {
            $query->where('end', '<=', $request->input('end'));
        }

        $events = $query->orderBy('start')->get();

        return response()->json(['ok' => true, 'data' => $events], 200);
    }

    /**
     * Store a new event + notify org users
     */
    public function store(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);

        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'start'       => ['required', 'date'],
            'end'         => ['nullable', 'date', 'after_or_equal:start'],
            'category' => ['nullable', 'string', Rule::in(['TODO','REMINDER','HOLIDAY'])],
            'all_day'     => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
            'location'    => ['nullable', 'string', 'max:255'],
            'color'       => ['nullable', 'string', 'max:20'],
        ]);

        // Robust rule: if not all_day, end should exist (FullCalendar timed events)
        $allDay = (bool) ($data['all_day'] ?? false);
        if (!$allDay && empty($data['end'])) {
            return response()->json([
                'ok' => false,
                'message' => 'Timed events must have an end date/time.'
            ], 422);
        }

        $event = DB::transaction(function () use ($request, $data, $companyId) {
            $event = Event::create([
                'company_id'  => $companyId,
                'title'       => $data['title'],
                'description' => $data['description'] ?? null,
                'location'    => $data['location'] ?? null,
                'category' => $data['category'] ?? 'REMINDER',
                'start'       => $data['start'],
                'end'         => $data['end'] ?? null,
                'all_day'     => (bool) ($data['all_day'] ?? false),
                'color'       => $data['color'] ?? null,
                'created_by'  => $request->user()->id,
                'updated_by'  => $request->user()->id,
            ]);

            return $event;
        });

        // notify everyone in org
        $users = $this->companyUsersQuery($request)->get();
        foreach ($users as $user) {
            $user->notify(new CalendarEventNotification('created', $event));
        }

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
            'all_day'     => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
            'location'    => ['nullable', 'string', 'max:255'],
            'color'       => ['nullable', 'string', 'max:20'],
        ]);

        // validate end >= start if both are provided or if start changes
        $start = $data['start'] ?? $event->start;
        $end = array_key_exists('end', $data) ? $data['end'] : $event->end;

        if ($end && strtotime($end) < strtotime($start)) {
            return response()->json([
                'ok' => false,
                'message' => 'The end must be after or equal to start.'
            ], 422);
        }

        $allDay = array_key_exists('all_day', $data) ? (bool)$data['all_day'] : (bool)$event->all_day;
        if (!$allDay && empty($end)) {
            return response()->json([
                'ok' => false,
                'message' => 'Timed events must have an end date/time.'
            ], 422);
        }

        $event->update([
            ...$data,
            'updated_by' => $request->user()->id,
        ]);

        $users = $this->companyUsersQuery($request)->get();
        foreach ($users as $user) {
            $user->notify(new CalendarEventNotification('updated', $event));
        }

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

        // Create a lightweight object for notification payload after deletion
        $event->title = $eventTitle;

        $users = $this->companyUsersQuery($request)->get();
        foreach ($users as $user) {
            $user->notify(new CalendarEventNotification('deleted', $event));
        }

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

        $event->update([
            'start' => $data['start'],
            'end' => $end,
            'all_day' => $allDay,
            'updated_by' => $request->user()->id,
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

    public function sync(Request $request): JsonResponse
    {
        return response()->json(['ok' => false, 'message' => 'Sync not implemented'], 501);
    }
}
