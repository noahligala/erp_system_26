<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Http\Exceptions\HttpResponseException; // 💡 NEW: Import exception

class LoanController extends Controller
{
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
            'principal_amount' => 'required|numeric|min:1',
            'monthly_repayment' => 'required|numeric|min:1',
            'issue_date' => 'required|date',
        ]);

        $loan = $employee->loans()->create([
            'company_id' => $employee->company_id,
            'principal_amount' => $validated['principal_amount'],
            'monthly_repayment' => $validated['monthly_repayment'],
            'remaining_balance' => $validated['principal_amount'],
            'issue_date' => $validated['issue_date'],
        ]);

        return response()->json($loan, 201);
    }
}
