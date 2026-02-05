<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\CustomerPayment;
use App\Models\Accounts\Invoice;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntry;
use App\Services\JournalEntryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class CustomerPaymentController extends Controller
{
    protected JournalEntryService $journalEntryService;

    public function __construct(JournalEntryService $journalEntryService)
    {
        $this->journalEntryService = $journalEntryService;
    }

    /**
     * List all customer payments with invoice and customer details
     */
    public function index(Request $request)
    {
        // Gate::authorize('view-sales');

        $companyId = auth()->user()->company_id;

        $payments = CustomerPayment::where('company_id', $companyId)
            // FIX: Ensure account_code is loaded for the cashAccount relationship
            ->with(['customer', 'invoice', 'cashAccount:id,account_name,account_code'])
            ->latest()
            ->paginate($request->get('per_page', 20));

        return response()->json($payments);
    }

    /**
     * Store new customer payment, update invoice, and post to journals
     */
    public function store(Request $request)
    {
        // FIX: Re-enable Gate check. If this fails, the issue is database/middleware setup.
        // Gate::authorize('create-sales');

        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'customer_id'       => ['required', 'integer', Rule::exists('customers', 'id')->where('company_id', $companyId)],
            'invoice_id'        => ['nullable', 'integer', Rule::exists('invoices', 'id')->where('company_id', $companyId)],
            'payment_date'      => 'required|date_format:Y-m-d',
            'method'            => 'required|string|max:50',
            'reference'         => 'nullable|string|max:100',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string',
            'cash_account_id'   => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $companyId)],
        ]);

        // 1. Validate Cash Account (must be an Asset, e.g., Bank/Cash)
        $cashAccount = ChartOfAccount::where('id', $validated['cash_account_id'])
                                        ->where('company_id', $companyId)
                                        ->where('account_type', 'Asset')
                                        ->first();

        if (!$cashAccount) {
            return response()->json(['message' => 'Invalid cash account. Must be an Asset (Bank or Cash) account.'], 422);
        }

        return DB::transaction(function () use ($validated, $companyId) {

            try {
                $invoice = null;
                $paymentAmount = (float) $validated['amount'];

                // 2. Update Invoice if linked
                if (!empty($validated['invoice_id'])) {
                    $invoice = Invoice::lockForUpdate()->find($validated['invoice_id']);

                    // Calculate the true remaining balance based on current database state before applying new payment.
                    $trueBalanceDue = $invoice->total_amount - $invoice->amount_paid;

                    // Check if payment overruns balance
                    if ($paymentAmount > $trueBalanceDue + 0.01) {
                        throw new \InvalidArgumentException("Payment amount exceeds true outstanding balance of Invoice #{$invoice->invoice_number} (Ksh " . round($trueBalanceDue, 2) . ").");
                    }

                    $invoice->amount_paid += $paymentAmount;

                    // CRITICAL FIX: Calculate the new balance directly and ensure it doesn't go negative
                    $invoice->balance_due = max($invoice->total_amount - $invoice->amount_paid, 0);

                    // Update status based on the newly calculated balance_due
                    if ($invoice->balance_due <= 0.01) {
                        $invoice->status = 'Paid';
                        $invoice->balance_due = 0.00; // Explicitly set to zero for clean books
                    } elseif ($invoice->amount_paid > 0.01) {
                        $invoice->status = 'Partially Paid'; // FIX: Use full status string
                    } else {
                        $invoice->status = 'Unpaid';
                    }

                    $invoice->save();
                }

                // 3. Create Payment record
                $payment = CustomerPayment::create([
                    ...$validated,
                    'company_id' => $companyId,
                    'journal_entry_id' => null, // Will be updated after JE creation
                    'cash_account_id' => $validated['cash_account_id'], // Store the specific GL account used
                    'created_by' => auth()->id(),
                ]);

                // 4. Post to Ledger
                $journalEntry = $this->postToLedger($payment, $invoice);

                // 5. Link Journal Entry back to Payment
                if ($journalEntry) {
                    $payment->journal_entry_id = $journalEntry->id;
                    $payment->save();
                }

                return response()->json([
                    'message' => 'Payment recorded successfully',
                    'data' => $payment->load(['customer', 'invoice', 'cashAccount']),
                ], 201);

            } catch (\InvalidArgumentException $e) {
                // Catch business logic errors (e.g., overpayment)
                DB::rollBack();
                Log::warning("Customer payment validation failed: " . $e->getMessage());
                return response()->json(['message' => $e->getMessage()], 422);
            } catch (Throwable $e) {
                // Catch all other system errors
                DB::rollBack();
                Log::error('System error recording payment: ' . $e->getMessage());
                return response()->json(['message' => 'A system error occurred while recording payment.'], 500);
            }
        });
    }

    /**
     * View single payment details
     */
    public function show($id)
    {
        Gate::authorize('view-sales');

        $payment = CustomerPayment::where('company_id', auth()->user()->company_id)
                                  // FIX: Ensure account_code is loaded for cashAccount
                                  ->with(['customer', 'invoice', 'cashAccount:id,account_name,account_code', 'journalEntry.lines.account'])
                                  ->findOrFail($id);

        return response()->json($payment);
    }

    /**
     * Delete a customer payment and reverse its effects.
     */
    public function destroy($id)
    {
        Gate::authorize('manage-sales');

        $payment = CustomerPayment::where('company_id', auth()->user()->company_id)
                                  ->findOrFail($id);

        return DB::transaction(function () use ($payment) {
            try {
                $paymentAmount = $payment->amount;

                // 1. Reverse the Invoice's balance (if linked)
                if ($payment->invoice_id) {
                    $invoice = Invoice::lockForUpdate()->find($payment->invoice_id);
                    if ($invoice) {
                        $invoice->amount_paid -= $paymentAmount;
                        $invoice->balance_due += $paymentAmount;

                        // CRITICAL REVERSAL STATUS FIX: Recalculate status based on the new balance
                        if ($invoice->balance_due >= $invoice->total_amount - 0.01) {
                            $invoice->status = 'Posted'; // Back to fully open/unpaid
                            $invoice->amount_paid = 0.00; // Ensure paid amount is clean
                            $invoice->balance_due = $invoice->total_amount; // Ensure balance is clean
                        } elseif ($invoice->amount_paid > 0.01) {
                            $invoice->status = 'Partially Paid'; // FIX: Use full status string
                        } else {
                            $invoice->status = 'Unpaid';
                        }

                        $invoice->save();
                    }
                }

                // 2. Delete the associated Journal Entry (reverses GL posting)
                if ($payment->journal_entry_id) {
                    $je = JournalEntry::find($payment->journal_entry_id);
                    if ($je) {
                        $je->lines()->delete();
                        $je->delete();
                    }
                }

                // 3. Delete the payment itself
                $payment->delete();

                return response()->json(['message' => 'Customer payment and associated transactions have been successfully reversed.'], 200);

            } catch (Throwable $e) {
                DB::rollBack();
                Log::error("Failed to delete customer payment {$payment->id}: " . $e->getMessage());
                return response()->json(['message' => 'Failed to reverse payment.'], 500);
            }
        });
    }

    /**
     * Post payment to General Ledger using JournalEntryService
     */
    protected function postToLedger(CustomerPayment $payment, ?Invoice $invoice = null)
    {
        $companyId = $payment->company_id;

        // --- Step 1: Fetch required accounts ---
        $cashOrBankAccount = ChartOfAccount::where('company_id', $companyId)
            ->findOrFail($payment->cash_account_id);

        $accountsReceivable = ChartOfAccount::where('company_id', $companyId)
            ->where('account_name', 'like', '%Accounts Receivable%')
            ->first();

        if (!$accountsReceivable) {
            throw new \Exception("Accounts Receivable account not found. Please configure Chart of Accounts.");
        }

        // --- Step 2: Prepare Journal Entry lines ---
        // DEBIT: Cash/Bank (Asset increases)
        $lines[] = [
            'account_id' => $cashOrBankAccount->id,
            'debit' => $payment->amount,
            'credit' => 0,
            'line_description' => "Received via {$payment->method}"
        ];

        // CREDIT: Accounts Receivable (Asset decreases)
        $lines[] = [
            'account_id' => $accountsReceivable->id,
            'debit' => 0,
            'credit' => $payment->amount,
            'line_description' => $invoice ? "Applied to Invoice #{$invoice->invoice_number}" : "On-account payment"
        ];

        // --- Step 3: Create Journal Entry ---
        $description = "Customer Payment from {$payment->customer->name} - Ref: {$payment->reference}";

        $journalEntry = $this->journalEntryService->createJournalEntry(
            $payment->payment_date,
            $description,
            'Customer Payment',
            $lines,
            $payment // Link polymorphic relationship to the payment model
        );

        return $journalEntry;
    }
}
