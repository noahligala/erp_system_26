<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\Budget;
use App\Models\Accounts\ChartOfAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Throwable;

class BudgetController extends Controller
{
    /**
     * List all budgets for a given period (or all if no period specified).
     */
    public function index(Request $request)
    {
        Gate::authorize('view-financial-reports'); // Or a dedicated 'manage-budgets' permission if you create one

        $companyId = auth()->user()->company_id;

        $query = Budget::where('company_id', $companyId)
            ->with('account:id,account_code,account_name,account_type');

        // Optional: Filter by year/month
        if ($request->filled('period')) {
            // Expecting YYYY-MM format, append -01 to make it a valid date
            $periodDate = Carbon::parse($request->period . '-01')->startOfMonth();
            $query->where('period', $periodDate->toDateString());
        }

        return response()->json($query->get());
    }

    /**
     * Store or Update a budget target.
     * We use updateOrCreate to simplify setting targets for a specific account/month.
     */
    public function store(Request $request)
    {
        // Gate::authorize('manage-financial-data'); // Use a high-level permission

        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'chart_of_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $companyId)],
            'period' => 'required|date_format:Y-m', // Frontend sends "2025-01"
            'amount' => 'required|numeric|min:0',
        ]);

        try {
            // Convert "YYYY-MM" to "YYYY-MM-01" for storage
            $periodDate = Carbon::parse($validated['period'] . '-01')->startOfMonth();

            // Check if account is valid for budgeting (Revenue or Expense usually)
            $account = ChartOfAccount::find($validated['chart_of_account_id']);
            if (!in_array($account->account_type, ['Revenue', 'Expense', 'Cost of Goods Sold', 'Other Income', 'Other Expense'])) {
                return response()->json(['message' => 'Budgets can only be set for P&L accounts (Revenue/Expense).'], 422);
            }

            $budget = Budget::updateOrCreate(
                [
                    'company_id' => $companyId,
                    'chart_of_account_id' => $validated['chart_of_account_id'],
                    'period' => $periodDate->toDateString(),
                ],
                [
                    'amount' => $validated['amount'],
                    'created_by' => auth()->id(),
                ]
            );

            return response()->json([
                'message' => 'Budget target set successfully.',
                'data' => $budget->load('account'),
            ]);

        } catch (Throwable $e) {
            Log::error('Failed to set budget: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to set budget target.'], 500);
        }
    }

    /**
     * Delete a budget target.
     */
    public function destroy($id)
    {
        // Gate::authorize('manage-financial-data');

        $budget = Budget::where('company_id', auth()->user()->company_id)->findOrFail($id);
        $budget->delete();

        return response()->json(['message' => 'Budget target removed.']);
    }
}
