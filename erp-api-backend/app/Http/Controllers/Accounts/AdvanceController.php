<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Advance;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Throwable;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdvanceController extends Controller
{
    /**
     * Store a newly created resource in storage.
     * This method issues a new salary advance to an employee.
     */
    public function store(Request $request, User $employee)
    {
        Gate::authorize('manage-loans-advances');

        // 💡 CRITICAL FIX: Ensure the employee belongs to the user's company
        if ($employee->company_id !== auth()->user()->company_id) {
            // Terminate request with a 404 response to hide the resource existence
            throw new HttpResponseException(response()->json([
                'message' => 'The employee was not found in your company.'
            ], 404));
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'issue_date' => 'required|date',
        ]);

        try {
            // Business Rule: Prevent issuing a new advance if an outstanding one already exists.
            $hasOutstandingAdvance = $employee->advances()->where('is_repaid', false)->exists();

            if ($hasOutstandingAdvance) {
                return response()->json([
                    'message' => 'This employee already has an outstanding advance that must be repaid before a new one can be issued.'
                ], 409); // 409 Conflict
            }

            $advance = $employee->advances()->create([
                'company_id' => $employee->company_id,
                'amount' => $validated['amount'],
                'issue_date' => $validated['issue_date'],
            ]);

            return response()->json($advance, 201);

        } catch (Throwable $e) {
            Log::error("Failed to issue advance for user {$employee->id}: " . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred while issuing the advance.'], 500);
        }
    }
}
