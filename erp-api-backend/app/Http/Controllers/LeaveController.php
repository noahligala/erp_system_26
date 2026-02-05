<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\LeaveType;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Mail\NewEmployeeCredentials; // Keep if used elsewhere
use Illuminate\Support\Facades\Mail; // Keep if sending mail
use Illuminate\Support\Str; // Keep if generating passwords

class LeaveController extends Controller
{
    /**
     * Get available leave types for the user's company.
     */
    public function getLeaveTypes(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
        }

        try {
            // Include default_days which might be needed for balance calculation info
            $leaveTypes = LeaveType::where('company_id', $user->company_id)->orderBy('name')->get(['id', 'name', 'default_days']);
            return response()->json(['status' => 'success', 'data' => $leaveTypes]);
        } catch (\Exception $e) {
            Log::error('Error fetching leave types: ' . $e->getMessage(), ['company_id' => $user->company_id]);
            return response()->json(['status' => 'error', 'message' => 'Could not fetch leave types.'], 500);
        }
    }

    /**
     * Get the authenticated user's leave balance.
     * Used for the Leave Request Form (shows self-balance).
     */
    public function getUserLeaveBalance(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
        }

        try {
            // Use calculation helper for the authenticated user
            $balanceData = $this->calculateLeaveBalanceForUser($user);
            return response()->json(['status' => 'success', 'data' => $balanceData]);
        } catch (\Exception $e) {
            Log::error('Error fetching own leave balance: ' . $e->getMessage(), ['user_id' => $user->id]);
            return response()->json(['status' => 'error', 'message' => 'Could not fetch leave balance.'], 500);
        }
    }

     /**
     * Get leave balance for a specific employee ID.
     * Used for the Employee Profile page.
     */
    public function getEmployeeLeaveBalance(Request $request, $employee) // Parameter is $employee ID
    {
        $requestingUser = $request->user();
        if (!$requestingUser->company_id) {
            return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
        }

        // --- Basic Authorization (Expand with roles/policies) ---
        // if (!in_array($requestingUser->company_role, ['MANAGER', 'ADMIN', 'OWNER'])) {
        //     return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        // }

        try {
            // Find the target employee within the same company using $employee ID
            $targetEmployee = User::where('company_id', $requestingUser->company_id)->findOrFail($employee);
        } catch (ModelNotFoundException $e) {
            Log::warning('Attempt to get leave balance for non-existent/wrong-company employee.', [
                'requesting_user_id' => $requestingUser->id,
                'target_employee_id' => $employee
            ]);
            return response()->json(['status' => 'error', 'message' => 'Employee not found.'], 404);
        }
        // --- End Authorization ---

        try {
            // Use calculation helper for the target employee
            $balanceData = $this->calculateLeaveBalanceForUser($targetEmployee);
            return response()->json(['status' => 'success', 'data' => $balanceData]);
        } catch (\Exception $e) {
            Log::error('Error fetching employee leave balance: ' . $e->getMessage(), [
                'requesting_user_id' => $requestingUser->id,
                'target_employee_id' => $employee,
            ]);
            return response()->json(['status' => 'error', 'message' => 'Could not fetch employee leave balance.'], 500);
        }
    }


    /**
     * Store a new leave request (submitted by the authenticated user for themselves).
     */
    public function storeLeaveRequest(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) {
            return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403);
        }

        // --- Check for existing pending request ---
        $existingPending = LeaveRequest::where('user_id', $user->id)
                                        ->where('status', 'pending')
                                        ->exists();
        if ($existingPending) {
            return response()->json([
                'status' => 'error',
                'message' => 'You already have a pending leave request. Please wait before submitting another.'
            ], 400); // Bad Request
        }

        $validator = Validator::make($request->all(), [
            'leave_type_id' => [
                'required',
                Rule::exists('leave_types', 'id')->where(function ($query) use ($user) {
                    $query->where('company_id', $user->company_id);
                }),
            ],
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        // --- Calculate requested days ---
        $requestedDays = $this->calculateLeaveDays($request->start_date, $request->end_date);
        if ($requestedDays <= 0) {
            return response()->json(['status' => 'error', 'errors' => ['end_date' => ['Leave duration must be at least one working day.']]], 422);
        }

        // --- Check Balance ---
        $leaveType = LeaveType::find($request->leave_type_id);
        $currentBalance = $this->calculateSpecificLeaveBalance($user, $leaveType->id);
        if ($requestedDays > $currentBalance) {
             return response()->json([
                'status' => 'error',
                'message' => "Insufficient leave balance for {$leaveType->name}. Available: {$currentBalance} days, Requested: {$requestedDays} days."
            ], 400); // Bad Request
        }

        // --- Check for Overlapping Approved/Pending Requests ---
         $overlappingRequest = LeaveRequest::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($query) use ($request) {
                $query->where(function($q) use ($request){
                    $q->where('start_date', '<=', $request->end_date)
                      ->where('end_date', '>=', $request->start_date);
                });
            })->first();

        if ($overlappingRequest) {
            return response()->json([
                'status' => 'error',
                'message' => "The requested dates overlap with an existing leave request (ID: {$overlappingRequest->id}) from {$overlappingRequest->start_date->format('Y-m-d')} to {$overlappingRequest->end_date->format('Y-m-d')}."
            ], 400);
        }

        DB::beginTransaction();
        try {
            $leaveRequest = LeaveRequest::create([
                'user_id' => $user->id,
                'leave_type_id' => $request->leave_type_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'reason' => $request->reason,
                'status' => 'pending',
                'requested_days' => $requestedDays, // Store calculated days
            ]);

            DB::commit();
            Log::info('Leave request submitted successfully.', ['user_id' => $user->id, 'request_id' => $leaveRequest->id]);
            // Notify manager/HR here

            return response()->json(['status' => 'success', 'message' => 'Leave request submitted successfully.'], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error submitting leave request: ' . $e->getMessage(), ['user_id' => $user->id, 'payload' => $request->all()]);
            return response()->json(['status' => 'error', 'message' => 'Could not submit leave request.'], 500);
        }
    }


    /**
     * Display a listing of leave requests for the user's company.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403); }

        // Add authorization check (manager/admin)
        // if (!in_array($user->company_role, ['MANAGER', 'ADMIN', 'OWNER'])) { ... }

        try {
            $query = LeaveRequest::whereHas('user', function ($q) use ($user) {
                $q->where('company_id', $user->company_id);
            })->with(['user:id,name', 'leaveType:id,name', 'approver:id,name'])
              ->latest();

            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            $leaveRequests = $query->paginate($request->input('per_page', 15));
            return response()->json(['status' => 'success', 'data' => $leaveRequests]);
        } catch (\Exception $e) {
            Log::error('Error fetching leave requests: ' . $e->getMessage(), ['company_id' => $user->company_id]);
            return response()->json(['status' => 'error', 'message' => 'Could not fetch leave requests.'], 500);
        }
    }

    /**
     * Get pending leave requests for the user's company.
     */
    public function getPendingRequests(Request $request)
    {
         $user = $request->user();
         if (!$user->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated with a company.'], 403); }
         // Add Authorization check

         try {
              $pendingRequests = LeaveRequest::where('status', 'pending')
                 ->whereHas('user', function ($q) use ($user) { $q->where('company_id', $user->company_id); })
                 ->with(['user:id,name', 'leaveType:id,name'])
                 ->latest()
                 ->paginate($request->input('per_page', 15));
             return response()->json(['status' => 'success', 'data' => $pendingRequests]);
         } catch (\Exception $e) {
             Log::error('Error fetching pending requests: ' . $e->getMessage(), ['company_id' => $user->company_id]);
             return response()->json(['status' => 'error', 'message' => 'Could not fetch pending requests.'], 500);
         }
    }

     /**
     * Get leave history for a specific employee.
     */
    public function getEmployeeLeaveHistory(Request $request, $employee)
    {
        $requestingUser = $request->user();
        if (!$requestingUser->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated.'], 403); }

        // Add authorization check

        try {
            $targetEmployee = User::where('company_id', $requestingUser->company_id)->findOrFail($employee);

            $history = LeaveRequest::where('user_id', $targetEmployee->id)
                ->with('leaveType:id,name')
                ->latest()
                ->limit(10) // Limit results for profile view
                ->get([
                    'id', 'leave_type_id', 'start_date', 'end_date', 'status', 'created_at', 'requested_days'
                ]);

            return response()->json(['status' => 'success', 'data' => $history]);

        } catch (ModelNotFoundException $e) { return response()->json(['status' => 'error', 'message' => 'Employee not found.'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching employee leave history: ' . $e->getMessage(), ['target_employee_id' => $employee]);
            return response()->json(['status' => 'error', 'message' => 'Could not fetch leave history.'], 500);
        }
    }


    /**
     * Approve a specific leave request.
     */
    public function approve(Request $request, LeaveRequest $leaveRequest)
    {
        $approver = $request->user();
        if (!$approver->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated.'], 403); }
        // Add full authorization check

        if ($leaveRequest->user->company_id !== $approver->company_id) { return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403); }
        if ($leaveRequest->status !== 'pending') { return response()->json(['status' => 'error', 'message' => 'Request not pending.'], 400); }

        // --- Check Balance Before Approval ---
        $requestedDays = $leaveRequest->requested_days ?? $this->calculateLeaveDays($leaveRequest->start_date, $leaveRequest->end_date);
        if ($requestedDays <= 0 && !$leaveRequest->requested_days) { // Recalculate if not stored & still 0
             Log::warning('Leave request approved with zero calculated days.', ['request_id' => $leaveRequest->id]);
             // Decide if zero-day requests should be allowed or errored out
            // return response()->json(['status' => 'error', 'message' => 'Invalid leave duration calculated (0 days).'], 400);
        }

        $currentBalance = $this->calculateSpecificLeaveBalance($leaveRequest->user, $leaveRequest->leave_type_id);

        if ($requestedDays > 0 && $requestedDays > $currentBalance) { // Only block if requesting > 0 days
             return response()->json([
                'status' => 'error',
                'message' => "Cannot approve: Insufficient balance for {$leaveRequest->leaveType->name}. Available: {$currentBalance}, Requested: {$requestedDays}."
            ], 400);
        }

        DB::beginTransaction();
        try {
            $leaveRequest->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'rejection_reason' => null,
                'requested_days' => $requestedDays, // Ensure it's stored
            ]);

            // Balance deduction logic goes here if using a balance table
            // For calculation method, no deduction needed in DB, just recalculate next time

            DB::commit();
            Log::info('Leave request approved.', ['request_id' => $leaveRequest->id, 'approver_id' => $approver->id]);
            // Notify employee

            return response()->json(['status' => 'success', 'message' => 'Leave request approved successfully.']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving leave request: ' . $e->getMessage(), ['request_id' => $leaveRequest->id]);
            return response()->json(['status' => 'error', 'message' => 'Could not approve leave request.'], 500);
        }
    }

    /**
     * Reject a specific leave request.
     */
    public function reject(Request $request, LeaveRequest $leaveRequest)
    {
         $rejector = $request->user();
        if (!$rejector->company_id) { return response()->json(['status' => 'error', 'message' => 'User not associated.'], 403); }
        // Add full authorization check

         if ($leaveRequest->user->company_id !== $rejector->company_id) { return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403); }
         if ($leaveRequest->status !== 'pending') { return response()->json(['status' => 'error', 'message' => 'Request not pending.'], 400); }

        $validator = Validator::make($request->all(), ['rejection_reason' => 'required|string|max:500']);
        if ($validator->fails()) { return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422); }

        DB::beginTransaction();
        try {
             $leaveRequest->update([
                'status' => 'rejected',
                'approved_by' => $rejector->id,
                'approved_at' => now(),
                'rejection_reason' => $request->rejection_reason,
            ]);

            DB::commit();
            Log::info('Leave request rejected.', ['request_id' => $leaveRequest->id, 'rejector_id' => $rejector->id]);
            // Notify employee

            return response()->json(['status' => 'success', 'message' => 'Leave request rejected successfully.']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting leave request: ' . $e->getMessage(), ['request_id' => $leaveRequest->id]);
            return response()->json(['status' => 'error', 'message' => 'Could not reject leave request.'], 500);
        }
    }


    // --- Balance Calculation Helpers ---

    /**
     * Calculate remaining balance for a specific leave type for a user.
     * Assumes allocation is based on LeaveType default_days per calendar year.
     * TODO: Implement more complex allocation rules (tenure, pro-rata, carry-over).
     */
    private function calculateSpecificLeaveBalance(User $user, int $leaveTypeId): float
    {
        $leaveType = LeaveType::where('company_id', $user->company_id)
                                ->where('id', $leaveTypeId)
                                ->first();
        if (!$leaveType) return 0;

        $allocatedDays = $leaveType->default_days ?? 0;
        // --- Add more complex allocation logic here ---

        $currentYear = now()->year;
        $approvedDaysTaken = LeaveRequest::where('user_id', $user->id)
            ->where('leave_type_id', $leaveTypeId)
            ->where('status', 'approved')
            ->whereYear('start_date', $currentYear) // Basic year check
            ->sum(DB::raw('COALESCE(requested_days, 0)')); // Sum stored days, treat null as 0

        $remainingBalance = $allocatedDays - $approvedDaysTaken;

        return (float) max(0, $remainingBalance);
    }

    /**
     * Calculate all leave balances for a user.
     */
    private function calculateLeaveBalanceForUser(User $user): array
    {
        $balances = [];
        $leaveTypes = LeaveType::where('company_id', $user->company_id)->get();

        foreach ($leaveTypes as $type) {
            // Generate key like 'Annual Leave' (more readable for frontend)
            $key = trim(str_replace(['leave', 'balance'], '', Str::snake($type->name)));
            $key = str_replace('_', ' ', $key);
            $key = ucwords($key); // Capitalize words

            $balances[$key] = $this->calculateSpecificLeaveBalance($user, $type->id);
        }
        // If no types found, return an empty array or default structure
        return $balances ?: ['message' => 'No leave types configured'];
    }

    /**
     * Calculate working days between two dates (excluding weekends).
     * TODO: Exclude public holidays based on company settings.
     */
    private function calculateLeaveDays($startDate, $endDate): float
    {
        try {
            $start = Carbon::parse($startDate);
            $end = Carbon::parse($endDate);

            if ($end->isBefore($start)) return 0;

            // Calculate difference in days, then subtract weekends
            $days = $start->diffFiltered(Carbon::class, fn (Carbon $date) => $date->isWeekday(), $end)->days + 1; // +1 for inclusive
            // Note: diffInWeekdays counts *transitions* between weekdays.
            // diffFiltered provides more control for future holiday exclusion.

            // You might need a dedicated Holiday model/service here to subtract holidays within the range.

            return (float) max(0, $days);

        } catch (\Exception $e) {
            Log::error("Error calculating leave days", ['start' => $startDate, 'end' => $endDate, 'error' => $e->getMessage()]);
            return 0;
        }
    }

} // End of Class
