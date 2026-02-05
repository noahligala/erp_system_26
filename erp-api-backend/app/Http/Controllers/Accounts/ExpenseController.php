<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\Expense;
use App\Models\Accounts\ChartOfAccount;
use App\Services\JournalEntryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ExpenseController extends Controller
{
    /**
     * Display a listing of the expenses.
     */
    public function index()
    {
        Gate::authorize('view-expenses');

        Log::info("Fetching expenses for user: " . auth()->id());

        try {
            $expenses = Expense::where('company_id', auth()->user()->company_id)
                ->with('user:id,name', 'approver:id,name') // Load relationships
                ->latest()
                ->get();

            return response()->json($expenses);

        } catch (Throwable $e) {
            Log::error('Failed to fetch expenses: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to fetch expenses.'], 500);
        }
    }

    /**
     * Store a new expense claim.
     */
    public function store(Request $request)
    {
        Gate::authorize('create-expenses');

        Log::info('Attempting to store new expense for user: ' . auth()->id());

        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'vendor' => 'required|string|max:255',
            'category' => 'required|string|max:255', // This is the Expense Account Name
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
        ]);

        Log::debug('Expense validation passed.', $validated);

        try {
            $expense = Expense::create([
                ...$validated,
                'company_id' => auth()->user()->company_id,
                'user_id' => auth()->id(),
                'status' => 'Pending', // All new expenses start as Pending
            ]);

            Log::info("Successfully created expense ID: {$expense->id} for company: " . auth()->user()->company_id);
            return response()->json($expense, 201);

        } catch (Throwable $e) {
            Log::error('Failed to create expense claim: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to create expense claim.'], 500);
        }
    }

    /**
     * Update the specified expense (e.g., approve, edit details).
     */
    public function update(Request $request, Expense $expense, JournalEntryService $journalEntryService)
    {
        Gate::authorize('manage-expenses');

        if ($expense->company_id !== auth()->user()->company_id) {
            Log::warning("Forbidden: User " . auth()->id() . " tried to update expense {$expense->id} from another company.");
            return response()->json(['message' => 'Forbidden'], 403);
        }

        Log::info("Attempting to update expense ID: {$expense->id} by user: " . auth()->id());

        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'vendor' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'status' => ['required', Rule::in(['Pending', 'Approved', 'Paid', 'Rejected'])],
        ]);

        Log::debug("Expense update validation passed for ID: {$expense->id}", $validated);

        $originalStatus = $expense->status;
        $newStatus = $validated['status'];

        try {
            // Update the basic info
            $expense->update($validated);

            // --- This is the key logic ---
            // If moving to "Paid" and it wasn't already posted
            if ($newStatus === 'Paid' && $originalStatus !== 'Paid' && !$expense->journal_entry_id) {

                Log::info("Expense {$expense->id} status changed to 'Paid'. Posting to General Ledger...");

                // 1. Find the expense account
                $expenseAccount = ChartOfAccount::where('company_id', $expense->company_id)
                    ->where('account_name', $expense->category)
                    ->firstOrFail(); // Throws ModelNotFoundException if category is invalid

                // 2. Find the payment account (FIX: Use robust search logic)
                $paymentAccount = ChartOfAccount::where('company_id', $expense->company_id)
                    ->where(function($q) {
                        // Look for 'Cash' or 'Bank' in the account name
                        $q->where('account_name', 'like', '%Cash%')
                          ->orWhere('account_name', 'like', '%Bank%');
                    })
                    ->where('account_type', 'Asset') // Ensure we only select asset accounts
                    ->firstOrFail(); // Throws ModelNotFoundException if no suitable payment account is found

                Log::debug("Found GL accounts. Expense: {$expenseAccount->id}, Payment: {$paymentAccount->id}");

                // 3. Prepare JE lines
                $lines = [
                    ['account_id' => $expenseAccount->id, 'debit' => $expense->amount, 'credit' => 0, 'line_description' => $expense->description ?? "Expense for {$expense->vendor}"],
                    ['account_id' => $paymentAccount->id, 'debit' => 0, 'credit' => $expense->amount, 'line_description' => "Payment to {$expense->vendor}"],
                ];

                // 4. Create the Journal Entry
                $journalEntry = $journalEntryService->createJournalEntry(
                    $expense->date,
                    $expense->description ?? "Expense: {$expense->vendor}",
                    'Payment Voucher',
                    $lines,
                    $expense
                );

                Log::info("Created Journal Entry ID: {$journalEntry->id} for Expense ID: {$expense->id}");

                // 5. Link the JE to the expense
                $expense->update([
                    'journal_entry_id' => $journalEntry->id,
                    'approved_by' => auth()->id(),
                    'approved_at' => now(),
                ]);
            }

            Log::info("Successfully updated expense ID: {$expense->id}");
            return response()->json($expense->load('user:id,name', 'approver:id,name'));

        } catch (ModelNotFoundException $e) {
            Log::error("Failed to post expense {$expense->id} to GL: " . $e->getMessage());
            // This is a user error (e.g., "Fuel" is not a valid account name)
            return response()->json(['message' => 'Failed to post to GL. Check if the Category matches an Expense account name, or if a Cash/Bank account exists.'], 422);
        } catch (Throwable $e) {
            Log::error("Failed to update expense {$expense->id}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to update expense.'], 500);
        }
    }

    /**
     * Remove the specified expense from storage (soft delete).
     */
    public function destroy(Expense $expense)
    {
        Gate::authorize('manage-expenses');

        if ($expense->company_id !== auth()->user()->company_id) {
            Log::warning("Forbidden: User " . auth()->id() . " tried to delete expense {$expense->id} from another company.");
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($expense->journal_entry_id) {
            Log::warning("Failed delete attempt on expense {$expense->id}: Already posted to GL.");
            return response()->json(['message' => 'Cannot delete an expense that is already posted to the General Ledger.'], 422);
        }

        try {
            $expense->delete();
            Log::info("Successfully soft-deleted expense ID: {$expense->id} by user: " . auth()->id());
            return response()->json(null, 204);

        } catch (Throwable $e) {
            Log::error("Failed to delete expense {$expense->id}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to delete expense.'], 500);
        }
    }
}
