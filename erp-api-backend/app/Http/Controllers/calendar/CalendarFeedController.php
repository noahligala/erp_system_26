<?php

namespace App\Http\Controllers\Calendar;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;

use App\Models\Calendar\Event as CalendarEvent;
use App\Models\LeaveRequest;
use App\Models\HR\OffDay;
use App\Models\HR\AwolDay;
use App\Models\Company\Announcement;

class CalendarFeedController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    private function companyId(Request $request): int
    {
        return (int) $request->user()->company_id;
    }

    private function parseRange(Request $request): array
    {
        $startRaw = $request->query('start');
        $endRaw   = $request->query('end');

        // defensive defaults (30 day window) to avoid crashes
        $start = $startRaw ? Carbon::parse($startRaw)->startOfDay() : now()->startOfDay();
        $end   = $endRaw ? Carbon::parse($endRaw)->endOfDay() : now()->addDays(30)->endOfDay();

        return [$start, $end];
    }

    /**
     * Overlap: event intersects [start,end]
     * - event.start <= end
     * - and (event.end is null OR event.end >= start)
     */
    private function overlapQuery($q, Carbon $start, Carbon $end)
    {
        return $q->where('start', '<=', $end)
                 ->where(function ($qq) use ($start) {
                     $qq->whereNull('end')
                        ->orWhere('end', '>=', $start);
                 });
    }

    public function index(Request $request)
    {
        $companyId = $this->companyId($request);

        [$start, $end] = $this->parseRange($request);

        // 1) Manual calendar events (company-wide)
        // NOTE: Do NOT filter by events.user_id unless your events table actually has user_id.
        $manual = CalendarEvent::query()
            ->where('company_id', $companyId)
            ->tap(fn ($q) => $this->overlapQuery($q, $start, $end))
            ->orderBy('start')
            ->get()
            ->map(fn ($e) => [
                'id' => (string) $e->id,
                'title' => $e->title,
                'start' => $e->start?->toIso8601String(),
                'end' => $e->end?->toIso8601String(),
                'allDay' => (bool) $e->all_day,
                'backgroundColor' => $e->color,
                'borderColor' => $e->color,
                'editable' => true,
                'extendedProps' => [
                    'category' => $e->category ?? 'REMINDER',
                    'description' => $e->description,
                    'location' => $e->location,
                    'source' => 'manual',
                    'created_by' => $e->created_by,
                    'updated_by' => $e->updated_by,
                    'is_done' => (bool) ($e->is_done ?? false),
                ],
            ]);

        /**
         * IMPORTANT FIX:
         * LeaveRequest does NOT have company_id (per your model).
         * Scope by the related user's company_id instead.
         */
        $leave = LeaveRequest::query()
            ->with(['user']) // avoid N+1 when reading user->name
            ->where('status', 'approved')
            ->whereHas('user', function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            })
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->get()
            ->map(fn ($l) => [
                'id' => "leave-{$l->id}",
                // Replace with whatever your User fields are (name / first_name+last_name)
                'title' => (($l->user?->name ?? 'Employee') . " - Leave"),
                'start' => Carbon::parse($l->start_date)->toDateString(),
                'end' => Carbon::parse($l->end_date)->addDay()->toDateString(), // end exclusive for allDay
                'allDay' => true,
                'editable' => false,
                'backgroundColor' => 'rgba(46, 204, 113, 0.25)',
                'borderColor' => 'rgba(46, 204, 113, 0.25)',
                'extendedProps' => [
                    'category' => 'LEAVE',
                    'source' => 'hr',
                    'user_id' => $l->user_id,
                    'leave_type_id' => $l->leave_type_id,
                    'requested_days' => $l->requested_days,
                    'reason' => $l->reason,
                    'approved_by' => $l->approved_by,
                    'approved_at' => $l->approved_at?->toIso8601String(),
                ],
            ]);

        // 3) Off-days (company-scoped; assumes off_days has company_id + date)
        $offdays = OffDay::query()
            ->where('company_id', $companyId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->map(fn ($d) => [
                'id' => "offday-{$d->id}",
                'title' => "{$d->employee_name} - Off-day",
                'start' => Carbon::parse($d->date)->toDateString(),
                'allDay' => true,
                'editable' => false,
                'backgroundColor' => 'rgba(52, 152, 219, 0.18)',
                'borderColor' => 'rgba(52, 152, 219, 0.18)',
                'extendedProps' => [
                    'category' => 'OFFDAY',
                    'source' => 'hr',
                    'employee_id' => $d->employee_id,
                ],
            ]);

        // 4) AWOL (company-scoped; assumes awol_days has company_id + date)
        $awol = AwolDay::query()
            ->where('company_id', $companyId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->map(fn ($a) => [
                'id' => "awol-{$a->id}",
                'title' => "{$a->employee_name} - AWOL",
                'start' => Carbon::parse($a->date)->toDateString(),
                'allDay' => true,
                'editable' => false,
                'backgroundColor' => 'rgba(231, 76, 60, 0.22)',
                'borderColor' => 'rgba(231, 76, 60, 0.22)',
                'extendedProps' => [
                    'category' => 'AWOL',
                    'source' => 'hr',
                    'employee_id' => $a->employee_id,
                    'reason' => $a->reason ?? null,
                ],
            ]);

        // 5) Company announcements / planned events (overlap too)
        $companyEvents = Announcement::query()
            ->where('company_id', $companyId)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<=', $end)
            ->where(function ($q) use ($start) {
                $q->whereNull('ends_at')
                  ->orWhere('ends_at', '>=', $start);
            })
            ->get()
            ->map(fn ($c) => [
                'id' => "company-{$c->id}",
                'title' => $c->title,
                'start' => Carbon::parse($c->starts_at)->toIso8601String(),
                'end' => $c->ends_at ? Carbon::parse($c->ends_at)->toIso8601String() : null,
                'allDay' => (bool) $c->all_day,
                'editable' => false,
                'backgroundColor' => 'rgba(155, 89, 182, 0.22)',
                'borderColor' => 'rgba(155, 89, 182, 0.22)',
                'extendedProps' => [
                    'category' => 'COMPANY',
                    'source' => 'company',
                    'body' => $c->body ?? null,
                ],
            ]);

        return response()->json([
            'data' => array_values(array_merge(
                $manual->all(),
                $leave->all(),
                $offdays->all(),
                $awol->all(),
                $companyEvents->all(),
            )),
        ]);
    }
}
