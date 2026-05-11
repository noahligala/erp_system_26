<?php

namespace App\Http\Controllers;

use App\Models\EmployeeProfile;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class LeaveController extends Controller
{
    protected string $leaveRequestTable = 'leave_requests';
    protected string $leaveTypeTable = 'leave_types';

    /*
    |--------------------------------------------------------------------------
    | Leave Types
    |--------------------------------------------------------------------------
    */

    public function getLeaveTypes(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->ensureCompanyUser($user)) {
            return $response;
        }

        try {
            $query = LeaveType::query();

            if (Schema::hasColumn($this->leaveTypeTable, 'company_id')) {
                $query->where(function ($q) use ($user) {
                    $q->where('company_id', $user->company_id)
                        ->orWhereNull('company_id');
                });
            }

            $columns = $this->existingColumns($this->leaveTypeTable, [
                'id',
                'company_id',
                'name',
                'default_days',
                'description',
                'is_paid',
                'requires_approval',
                'is_active',
                'created_at',
                'updated_at',
            ]);

            $leaveTypes = $query
                ->when(
                    Schema::hasColumn($this->leaveTypeTable, 'is_active'),
                    fn ($q) => $q->where('is_active', true)
                )
                ->orderBy('name')
                ->get($columns)
                ->map(fn ($type) => [
                    'id' => $type->id,
                    'name' => $type->name,
                    'default_days' => (float) ($type->default_days ?? 0),
                    'description' => $type->description ?? null,
                    'is_paid' => (bool) ($type->is_paid ?? true),
                    'requires_approval' => (bool) ($type->requires_approval ?? true),
                    'is_active' => (bool) ($type->is_active ?? true),
                ])
                ->values();

            return $this->ok($leaveTypes, 'Leave types loaded successfully.');
        } catch (Throwable $e) {
            Log::error('Error fetching leave types.', [
                'company_id' => $user->company_id,
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not fetch leave types.', 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Leave Balance
    |--------------------------------------------------------------------------
    */

    public function getUserLeaveBalance(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->ensureCompanyUser($user)) {
            return $response;
        }

        try {
            return $this->ok(
                $this->calculateLeaveBalanceForUser($user),
                'Leave balance loaded successfully.'
            );
        } catch (Throwable $e) {
            Log::error('Error fetching own leave balance.', [
                'user_id' => $user->id,
                'company_id' => $user->company_id,
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not fetch leave balance.', 500);
        }
    }

    public function getEmployeeLeaveBalance(Request $request, $employee): JsonResponse
    {
        $requestingUser = $request->user();

        if ($response = $this->ensureCompanyUser($requestingUser)) {
            return $response;
        }

        try {
            $targetEmployee = $this->resolveCompanyEmployee($requestingUser, $employee);

            if (!$this->canViewEmployeeLeave($requestingUser, $targetEmployee)) {
                return $this->fail('You are not allowed to view this employee leave balance.', 403);
            }

            return $this->ok(
                $this->calculateLeaveBalanceForUser($targetEmployee),
                'Employee leave balance loaded successfully.'
            );
        } catch (ModelNotFoundException) {
            return $this->fail('Employee not found.', 404);
        } catch (Throwable $e) {
            Log::error('Error fetching employee leave balance.', [
                'requesting_user_id' => $requestingUser->id,
                'target_employee' => $employee,
                'company_id' => $requestingUser->company_id,
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not fetch employee leave balance.', 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Leave Requests
    |--------------------------------------------------------------------------
    */

    public function storeLeaveRequest(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->ensureCompanyUser($user)) {
            return $response;
        }

        $validator = Validator::make($request->all(), [
            'leave_type_id' => [
                'required',
                Rule::exists($this->leaveTypeTable, 'id')->where(function ($query) use ($user) {
                    if (Schema::hasColumn($this->leaveTypeTable, 'company_id')) {
                        $query->where(function ($q) use ($user) {
                            $q->where('company_id', $user->company_id)
                                ->orWhereNull('company_id');
                        });
                    }
                }),
            ],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:1000'],
            'half_day' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return $this->validationFail($validator->errors());
        }

        $validated = $validator->validated();

        try {
            $leaveType = LeaveType::query()->findOrFail($validated['leave_type_id']);

            $requestedDays = $this->calculateLeaveDays(
                $validated['start_date'],
                $validated['end_date'],
                (bool) ($validated['half_day'] ?? false)
            );

            if ($requestedDays <= 0) {
                return $this->validationFail([
                    'end_date' => ['Leave duration must be at least one working day.'],
                ]);
            }

            $existingPending = LeaveRequest::query()
                ->where('user_id', $user->id)
                ->whereIn(DB::raw('LOWER(status)'), ['pending', 'requested', 'submitted'])
                ->exists();

            if ($existingPending) {
                return $this->fail(
                    'You already have a pending leave request. Please wait before submitting another.',
                    409
                );
            }

            $overlappingRequest = $this->findOverlappingLeaveRequest(
                $user->id,
                $validated['start_date'],
                $validated['end_date']
            );

            if ($overlappingRequest) {
                return $this->fail(
                    "The requested dates overlap with an existing leave request from {$overlappingRequest->start_date->format('Y-m-d')} to {$overlappingRequest->end_date->format('Y-m-d')}.",
                    409
                );
            }

            $currentBalance = $this->calculateSpecificLeaveBalance($user, (int) $leaveType->id);

            if ($requestedDays > $currentBalance) {
                return $this->fail(
                    "Insufficient leave balance for {$leaveType->name}. Available: {$currentBalance} days, Requested: {$requestedDays} days.",
                    422
                );
            }

            $employeeProfile = $this->getEmployeeProfileForUser($user);

            $leaveRequest = DB::transaction(function () use (
                $user,
                $employeeProfile,
                $leaveType,
                $validated,
                $requestedDays
            ) {
                $payload = [
                    'company_id' => $user->company_id,
                    'user_id' => $user->id,
                    'employee_id' => $this->resolveEmployeeIdForWrite($employeeProfile, $user),
                    'employee_profile_id' => $employeeProfile?->id,

                    'leave_type_id' => $leaveType->id,
                    'type' => $leaveType->name,
                    'leave_type' => $leaveType->name,

                    'start_date' => Carbon::parse($validated['start_date'])->toDateString(),
                    'end_date' => Carbon::parse($validated['end_date'])->toDateString(),

                    'requested_days' => $requestedDays,
                    'days' => $requestedDays,
                    'number_of_days' => $requestedDays,
                    'duration' => $requestedDays,

                    'reason' => $validated['reason'],
                    'status' => $this->safeStatus($this->leaveRequestTable, 'status', 'pending'),

                    'applied_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                return $this->createLeaveRequest($payload);
            });

            Log::info('Leave request submitted.', [
                'user_id' => $user->id,
                'company_id' => $user->company_id,
                'leave_request_id' => $leaveRequest->id,
            ]);

            return $this->ok(
                $leaveRequest->loadMissing(['leaveType:id,name', 'user:id,name,email']),
                'Leave request submitted successfully.',
                201
            );
        } catch (Throwable $e) {
            Log::error('Error submitting leave request.', [
                'user_id' => $user->id,
                'company_id' => $user->company_id,
                'payload' => $request->all(),
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not submit leave request.', 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->ensureCompanyUser($user)) {
            return $response;
        }

        try {
            $query = LeaveRequest::query()
                ->whereHas('user', fn ($q) => $q->where('company_id', $user->company_id))
                ->with([
                    'user:id,name,email,company_id',
                    'leaveType:id,name',
                    'approver:id,name,email',
                ]);

            if (!$this->canManageLeaves($user)) {
                $query->where('user_id', $user->id);
            }

            if ($request->filled('status') && $request->status !== 'all') {
                $query->where(DB::raw('LOWER(status)'), strtolower($request->status));
            }

            if ($request->filled('user_id')) {
                $targetEmployee = $this->resolveCompanyEmployee($user, $request->input('user_id'));

                if (!$this->canViewEmployeeLeave($user, $targetEmployee)) {
                    return $this->fail('You are not allowed to view this employee leave history.', 403);
                }

                $query->where('user_id', $targetEmployee->id);
            }

            if ($request->filled('leave_type_id')) {
                $query->where('leave_type_id', $request->input('leave_type_id'));
            }

            if ($request->filled('from')) {
                $query->whereDate('start_date', '>=', Carbon::parse($request->input('from'))->toDateString());
            }

            if ($request->filled('to')) {
                $query->whereDate('end_date', '<=', Carbon::parse($request->input('to'))->toDateString());
            }

            if ($request->filled('search')) {
                $search = trim($request->input('search'));

                $query->where(function ($q) use ($search) {
                    $q->where('reason', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"));
                });
            }

            $perPage = min((int) $request->input('per_page', 15), 100);

            $leaveRequests = $query
                ->latest()
                ->paginate($perPage);

            return $this->ok($leaveRequests, 'Leave requests loaded successfully.');
        } catch (Throwable $e) {
            Log::error('Error fetching leave requests.', [
                'company_id' => $user->company_id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not fetch leave requests.', 500);
        }
    }

    public function getPendingRequests(Request $request): JsonResponse
    {
        $request->merge([
            'status' => 'pending',
        ]);

        return $this->index($request);
    }

    public function getEmployeeLeaveHistory(Request $request, $employee): JsonResponse
    {
        $requestingUser = $request->user();

        if ($response = $this->ensureCompanyUser($requestingUser)) {
            return $response;
        }

        try {
            $targetEmployee = $this->resolveCompanyEmployee($requestingUser, $employee);

            if (!$this->canViewEmployeeLeave($requestingUser, $targetEmployee)) {
                return $this->fail('You are not allowed to view this employee leave history.', 403);
            }

            $limit = min((int) $request->input('limit', 10), 50);

            $history = LeaveRequest::query()
                ->where('user_id', $targetEmployee->id)
                ->with(['leaveType:id,name', 'approver:id,name'])
                ->latest()
                ->limit($limit)
                ->get($this->existingColumns($this->leaveRequestTable, [
                    'id',
                    'user_id',
                    'leave_type_id',
                    'start_date',
                    'end_date',
                    'status',
                    'reason',
                    'requested_days',
                    'days',
                    'number_of_days',
                    'duration',
                    'approved_by',
                    'approved_at',
                    'rejection_reason',
                    'created_at',
                    'updated_at',
                ]));

            return $this->ok($history, 'Employee leave history loaded successfully.');
        } catch (ModelNotFoundException) {
            return $this->fail('Employee not found.', 404);
        } catch (Throwable $e) {
            Log::error('Error fetching employee leave history.', [
                'requesting_user_id' => $requestingUser->id,
                'target_employee' => $employee,
                'company_id' => $requestingUser->company_id,
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not fetch leave history.', 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Approval Actions
    |--------------------------------------------------------------------------
    */

    public function approve(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $approver = $request->user();

        if ($response = $this->ensureCompanyUser($approver)) {
            return $response;
        }

        try {
            $leaveRequest->loadMissing(['user', 'leaveType']);

            if (!$leaveRequest->user || (int) $leaveRequest->user->company_id !== (int) $approver->company_id) {
                return $this->fail('Unauthorized leave request.', 403);
            }

            if (!$this->canManageLeaves($approver)) {
                return $this->fail('You are not allowed to approve leave requests.', 403);
            }

            if (!$this->isPendingStatus($leaveRequest->status)) {
                return $this->fail('Only pending leave requests can be approved.', 409);
            }

            $requestedDays = $this->getStoredLeaveDays($leaveRequest);

            if ($requestedDays <= 0) {
                $requestedDays = $this->calculateLeaveDays($leaveRequest->start_date, $leaveRequest->end_date);
            }

            $currentBalance = $this->calculateSpecificLeaveBalance(
                $leaveRequest->user,
                (int) $leaveRequest->leave_type_id,
                excludeRequestId: $leaveRequest->id
            );

            if ($requestedDays > $currentBalance) {
                return $this->fail(
                    "Cannot approve: insufficient balance for {$leaveRequest->leaveType?->name}. Available: {$currentBalance}, Requested: {$requestedDays}.",
                    422
                );
            }

            DB::transaction(function () use ($leaveRequest, $approver, $requestedDays) {
                $payload = [
                    'status' => $this->safeStatus($this->leaveRequestTable, 'status', 'approved'),
                    'approved_by' => $approver->id,
                    'approved_at' => now(),
                    'rejected_by' => null,
                    'rejected_at' => null,
                    'rejection_reason' => null,
                    'requested_days' => $requestedDays,
                    'days' => $requestedDays,
                    'number_of_days' => $requestedDays,
                    'duration' => $requestedDays,
                    'updated_at' => now(),
                ];

                $leaveRequest->forceFill($this->filterColumns($this->leaveRequestTable, $payload));
                $leaveRequest->save();
            });

            Log::info('Leave request approved.', [
                'leave_request_id' => $leaveRequest->id,
                'approver_id' => $approver->id,
                'company_id' => $approver->company_id,
            ]);

            return $this->ok(
                $leaveRequest->fresh(['user:id,name,email', 'leaveType:id,name', 'approver:id,name,email']),
                'Leave request approved successfully.'
            );
        } catch (Throwable $e) {
            Log::error('Error approving leave request.', [
                'leave_request_id' => $leaveRequest->id,
                'approver_id' => $approver?->id,
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not approve leave request.', 500);
        }
    }

    public function reject(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $rejector = $request->user();

        if ($response = $this->ensureCompanyUser($rejector)) {
            return $response;
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return $this->validationFail($validator->errors());
        }

        try {
            $leaveRequest->loadMissing(['user', 'leaveType']);

            if (!$leaveRequest->user || (int) $leaveRequest->user->company_id !== (int) $rejector->company_id) {
                return $this->fail('Unauthorized leave request.', 403);
            }

            if (!$this->canManageLeaves($rejector)) {
                return $this->fail('You are not allowed to reject leave requests.', 403);
            }

            if (!$this->isPendingStatus($leaveRequest->status)) {
                return $this->fail('Only pending leave requests can be rejected.', 409);
            }

            DB::transaction(function () use ($leaveRequest, $rejector, $request) {
                $payload = [
                    'status' => $this->safeStatus($this->leaveRequestTable, 'status', 'rejected'),
                    'approved_by' => Schema::hasColumn($this->leaveRequestTable, 'approved_by') ? $rejector->id : null,
                    'approved_at' => Schema::hasColumn($this->leaveRequestTable, 'approved_at') ? now() : null,
                    'rejected_by' => $rejector->id,
                    'rejected_at' => now(),
                    'rejection_reason' => $request->input('rejection_reason'),
                    'updated_at' => now(),
                ];

                $leaveRequest->forceFill($this->filterColumns($this->leaveRequestTable, $payload));
                $leaveRequest->save();
            });

            Log::info('Leave request rejected.', [
                'leave_request_id' => $leaveRequest->id,
                'rejector_id' => $rejector->id,
                'company_id' => $rejector->company_id,
            ]);

            return $this->ok(
                $leaveRequest->fresh(['user:id,name,email', 'leaveType:id,name', 'approver:id,name,email']),
                'Leave request rejected successfully.'
            );
        } catch (Throwable $e) {
            Log::error('Error rejecting leave request.', [
                'leave_request_id' => $leaveRequest->id,
                'rejector_id' => $rejector?->id,
                'error' => $e->getMessage(),
            ]);

            return $this->fail('Could not reject leave request.', 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Balance Helpers
    |--------------------------------------------------------------------------
    */

    private function calculateSpecificLeaveBalance(
        User $user,
        int $leaveTypeId,
        ?int $excludeRequestId = null
    ): float {
        $leaveType = LeaveType::query()
            ->where('id', $leaveTypeId)
            ->when(
                Schema::hasColumn($this->leaveTypeTable, 'company_id'),
                fn ($q) => $q->where(function ($query) use ($user) {
                    $query->where('company_id', $user->company_id)
                        ->orWhereNull('company_id');
                })
            )
            ->first();

        if (!$leaveType) {
            return 0;
        }

        $allocatedDays = (float) ($leaveType->default_days ?? 0);

        $approvedStatuses = [
            'approved',
            'accepted',
            'completed',
        ];

        $approvedQuery = LeaveRequest::query()
            ->where('user_id', $user->id)
            ->where('leave_type_id', $leaveTypeId)
            ->whereIn(DB::raw('LOWER(status)'), $approvedStatuses)
            ->whereYear('start_date', now()->year);

        if ($excludeRequestId) {
            $approvedQuery->where('id', '!=', $excludeRequestId);
        }

        $approvedDaysTaken = $approvedQuery
            ->get()
            ->sum(fn ($request) => $this->getStoredLeaveDays($request));

        return (float) max(0, round($allocatedDays - $approvedDaysTaken, 2));
    }

    private function calculateLeaveBalanceForUser(User $user): array
    {
        $query = LeaveType::query();

        if (Schema::hasColumn($this->leaveTypeTable, 'company_id')) {
            $query->where(function ($q) use ($user) {
                $q->where('company_id', $user->company_id)
                    ->orWhereNull('company_id');
            });
        }

        if (Schema::hasColumn($this->leaveTypeTable, 'is_active')) {
            $query->where('is_active', true);
        }

        $leaveTypes = $query->orderBy('name')->get();

        if ($leaveTypes->isEmpty()) {
            return [
                'summary' => [
                    'total_allocated' => 0,
                    'total_taken' => 0,
                    'total_remaining' => 0,
                ],
                'balances' => [],
                'message' => 'No leave types configured.',
            ];
        }

        $balances = $leaveTypes->map(function ($type) use ($user) {
            $allocated = (float) ($type->default_days ?? 0);
            $remaining = $this->calculateSpecificLeaveBalance($user, (int) $type->id);
            $taken = max(0, $allocated - $remaining);

            return [
                'leave_type_id' => $type->id,
                'name' => $type->name,
                'key' => Str::slug($type->name, '_'),
                'allocated_days' => round($allocated, 2),
                'taken_days' => round($taken, 2),
                'remaining_days' => round($remaining, 2),
            ];
        })->values();

        return [
            'summary' => [
                'total_allocated' => round($balances->sum('allocated_days'), 2),
                'total_taken' => round($balances->sum('taken_days'), 2),
                'total_remaining' => round($balances->sum('remaining_days'), 2),
            ],
            'balances' => $balances,
        ];
    }

    private function calculateLeaveDays($startDate, $endDate, bool $halfDay = false): float
    {
        try {
            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->startOfDay();

            if ($end->isBefore($start)) {
                return 0;
            }

            $days = 0;
            $cursor = $start->copy();

            while ($cursor->lte($end)) {
                if ($cursor->isWeekday()) {
                    $days++;
                }

                $cursor->addDay();
            }

            if ($halfDay && $days === 1) {
                return 0.5;
            }

            return (float) max(0, $days);
        } catch (Throwable $e) {
            Log::error('Error calculating leave days.', [
                'start' => $startDate,
                'end' => $endDate,
                'error' => $e->getMessage(),
            ]);

            return 0;
        }
    }

    private function getStoredLeaveDays(LeaveRequest $leaveRequest): float
    {
        foreach (['requested_days', 'days', 'number_of_days', 'duration'] as $column) {
            if (isset($leaveRequest->{$column}) && is_numeric($leaveRequest->{$column})) {
                return (float) $leaveRequest->{$column};
            }
        }

        return $this->calculateLeaveDays($leaveRequest->start_date, $leaveRequest->end_date);
    }

    /*
    |--------------------------------------------------------------------------
    | Employee / Authorization Helpers
    |--------------------------------------------------------------------------
    */

    private function resolveCompanyEmployee(User $requestingUser, mixed $employee): User
    {
        $employeeId = (int) $employee;

        $targetUser = User::query()
            ->where('company_id', $requestingUser->company_id)
            ->where('id', $employeeId)
            ->first();

        if ($targetUser) {
            return $targetUser;
        }

        if (Schema::hasTable('employee_profiles')) {
            $profile = EmployeeProfile::query()
                ->with('user')
                ->where('id', $employeeId)
                ->whereHas('user', fn ($q) => $q->where('company_id', $requestingUser->company_id))
                ->first();

            if ($profile?->user) {
                return $profile->user;
            }
        }

        throw new ModelNotFoundException();
    }

    private function getEmployeeProfileForUser(User $user): ?EmployeeProfile
    {
        if (!Schema::hasTable('employee_profiles')) {
            return null;
        }

        return EmployeeProfile::query()
            ->where('user_id', $user->id)
            ->first();
    }

    private function resolveEmployeeIdForWrite(?EmployeeProfile $employeeProfile, User $user): ?int
    {
        if (!Schema::hasColumn($this->leaveRequestTable, 'employee_id')) {
            return null;
        }

        $referenceTable = $this->getForeignKeyReferenceTable($this->leaveRequestTable, 'employee_id');

        return match ($referenceTable) {
            'users' => $user->id,
            'employee_profiles' => $employeeProfile?->id,
            'employees' => $employeeProfile?->id,
            default => $employeeProfile?->id ?? $user->id,
        };
    }

    private function canViewEmployeeLeave(User $requestingUser, User $targetEmployee): bool
    {
        if ((int) $requestingUser->id === (int) $targetEmployee->id) {
            return true;
        }

        return $this->canManageLeaves($requestingUser);
    }

    private function canManageLeaves(User $user): bool
    {
        $role = strtoupper((string) ($user->company_role ?? ''));

        if (in_array($role, ['OWNER', 'ADMIN', 'MANAGER'], true)) {
            return true;
        }

        foreach (['manage-leave', 'manage-leaves', 'approve-leave', 'view-hrm', 'manage-hrm'] as $permission) {
            try {
                if (method_exists($user, 'can') && $user->can($permission)) {
                    return true;
                }
            } catch (Throwable) {
                continue;
            }
        }

        return false;
    }

    private function ensureCompanyUser(?User $user): ?JsonResponse
    {
        if (!$user) {
            return $this->fail('Unauthenticated.', 401);
        }

        if (!$user->company_id) {
            return $this->fail('User is not associated with a company.', 403);
        }

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Query Helpers
    |--------------------------------------------------------------------------
    */

    private function findOverlappingLeaveRequest(int $userId, string $startDate, string $endDate): ?LeaveRequest
    {
        return LeaveRequest::query()
            ->where('user_id', $userId)
            ->whereIn(DB::raw('LOWER(status)'), [
                'pending',
                'requested',
                'submitted',
                'approved',
                'accepted',
                'completed',
            ])
            ->whereDate('start_date', '<=', Carbon::parse($endDate)->toDateString())
            ->whereDate('end_date', '>=', Carbon::parse($startDate)->toDateString())
            ->first();
    }

    private function createLeaveRequest(array $payload): LeaveRequest
    {
        $model = new LeaveRequest();
        $model->forceFill($this->filterColumns($this->leaveRequestTable, $payload));
        $model->save();

        return $model;
    }

    private function isPendingStatus(?string $status): bool
    {
        return in_array(strtolower((string) $status), [
            'pending',
            'requested',
            'submitted',
            'draft',
        ], true);
    }

    private function safeStatus(string $table, string $column, string $desired): string
    {
        if (!Schema::hasColumn($table, $column)) {
            return $desired;
        }

        $allowed = $this->getEnumValues($table, $column);

        if (empty($allowed)) {
            return $desired;
        }

        $lookup = collect($allowed)
            ->mapWithKeys(fn ($status) => [strtolower($status) => $status]);

        $candidates = match (strtolower($desired)) {
            'pending' => ['pending', 'requested', 'submitted', 'draft'],
            'approved' => ['approved', 'accepted', 'completed'],
            'rejected' => ['rejected', 'declined', 'cancelled', 'canceled'],
            default => [$desired],
        };

        foreach ($candidates as $candidate) {
            if ($lookup->has(strtolower($candidate))) {
                return $lookup->get(strtolower($candidate));
            }
        }

        return $allowed[0];
    }

    private function getEnumValues(string $table, string $column): array
    {
        try {
            $row = DB::selectOne(
                "
                SELECT COLUMN_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                ",
                [DB::getDatabaseName(), $table, $column]
            );

            if (!$row || !isset($row->COLUMN_TYPE)) {
                return [];
            }

            $columnType = strtolower($row->COLUMN_TYPE);

            if (!str_starts_with($columnType, 'enum(')) {
                return [];
            }

            preg_match_all("/'([^']*)'/", $row->COLUMN_TYPE, $matches);

            return $matches[1] ?? [];
        } catch (Throwable) {
            return [];
        }
    }

    private function getForeignKeyReferenceTable(string $table, string $column): ?string
    {
        try {
            $row = DB::selectOne(
                "
                SELECT REFERENCED_TABLE_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                LIMIT 1
                ",
                [DB::getDatabaseName(), $table, $column]
            );

            return $row?->REFERENCED_TABLE_NAME;
        } catch (Throwable) {
            return null;
        }
    }

    private function existingColumns(string $table, array $columns): array
    {
        return collect($columns)
            ->filter(fn ($column) => Schema::hasColumn($table, $column))
            ->values()
            ->all();
    }

    private function filterColumns(string $table, array $data): array
    {
        return collect($data)
            ->filter(fn ($value, $column) => Schema::hasColumn($table, $column))
            ->all();
    }

    /*
    |--------------------------------------------------------------------------
    | Response Helpers
    |--------------------------------------------------------------------------
    */

    private function ok(mixed $data = null, string $message = 'Success.', int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => $message,
            'data' => $data,
        ], $statusCode);
    }

    private function fail(string $message, int $statusCode = 400, mixed $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'status' => 'error',
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $statusCode);
    }

    private function validationFail(mixed $errors): JsonResponse
    {
        return $this->fail('The given data was invalid.', 422, $errors);
    }
}
