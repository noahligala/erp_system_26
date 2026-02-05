<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\BillPayment;
use App\Models\Accounts\SupplierBill;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntry;
use App\Models\Supplier; // Assuming App\Models\Supplier
use App\Services\JournalEntryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class BillPaymentController extends Controller
{
    /**
     * Display a listing of bill payments.
     */
    public function index(Request $request)
    {
        Gate::authorize('view-bills'); // You'll need to define this permission

        $payments = BillPayment::where('company_id', auth()->user()->company_id)
            ->with(['supplier:id,name', 'bill:id,bill_number'])
            ->latest('payment_date')
            ->paginate($request->get('per_page', 20));

        return response()->json($payments);
    }

    /**
     * Store a new bill payment.
     */
    public function store(Request $request, JournalEntryService $journalEntryService)
    {
        Gate::authorize('create-bills'); // Or a new 'create-payments' permission

        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', Rule::exists('suppliers', 'id')->where('company_id', $companyId)],
            'supplier_bill_id' => ['nullable', 'integer', Rule::exists('supplier_bills', 'id')->where('company_id', $companyId)],
            'payment_date' => 'required|date_format:Y-m-d',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'payment_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $companyId)], // e.g., Your Bank Account ID
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // 1. Validate Payment Account (must be an Asset, e.g., Bank/Cash)
        $paymentAccount = ChartOfAccount::where('id', $validated['payment_account_id'])
                                        ->where('company_id', $companyId)
                                        ->where('account_type', 'Asset')
                                        ->first();

        if (!$paymentAccount) {
            return response()->json(['message' => 'Invalid payment account. Must be an Asset (Bank or Cash) account.'], 422);
        }

        // 2. Find Accounts Payable account
        $apAccount = ChartOfAccount::where('company_id', $companyId)
                                    ->where(function($q) {
                                        $q->where('account_code', '2010') // Standard AP Code
                                          ->orWhere('account_name', 'Accounts Payable');
                                    })
                                    ->first();
        if (!$apAccount) {
            Log::error("CRITICAL: 'Accounts Payable' system account not found for company {$companyId}.");
            return response()->json(['message' => '"Accounts Payable" account not found. Please configure Chart of Accounts.'], 500);
        }

        DB::beginTransaction();
        try {
            $bill = null;
            $supplier = Supplier::find($validated['supplier_id']);

            // 3. Update the Bill if one is linked
            if ($validated['supplier_bill_id']) {
                $bill = SupplierBill::lockForUpdate()->find($validated['supplier_bill_id']);

                $newAmountPaid = $bill->amount_paid + $validated['amount'];
                $newBalance = $bill->amount - $newAmountPaid;

                // Check for overpayment
                if ($newBalance < -0.01) { // Allow for tiny float errors
                    throw new \Exception("Payment amount (Ksh {$validated['amount']}) exceeds bill balance (Ksh {$bill->balance_due}).");
                }

                $bill->amount_paid = $newAmountPaid;
                $bill->balance_due = $newBalance;

                if ($newBalance <= 0.01) {
                    $bill->status = 'Paid';
                } else {
                    $bill->status = 'Partially Paid';
                }
                $bill->save();
            }

            // 4. Create the Bill Payment record
            $payment = BillPayment::create([
                ...$validated,
                'company_id' => $companyId,
                'created_by' => auth()->id(),
            ]);

            // 5. Prepare Journal Entry Lines
            $description = $bill
                ? "Payment to {$supplier->name} for Bill #{$bill->bill_number}"
                : "On-account payment to {$supplier->name}";

            $lines = [
                [
                    'account_id' => $apAccount->id,
                    'debit' => $payment->amount, // Debit Accounts Payable (reduces liability)
                    'credit' => 0,
                    'line_description' => $bill ? "Bill #{$bill->bill_number}" : "Ref: {$payment->reference}",
                ],
                [
                    'account_id' => $paymentAccount->id,
                    'debit' => 0,
                    'credit' => $payment->amount, // Credit Cash/Bank (reduces asset)
                    'line_description' => "Paid via {$payment->payment_method}",
                ]
            ];

            // 6. Create the Journal Entry
            $journalEntry = $journalEntryService->createJournalEntry(
                $payment->payment_date,
                $description,
                'Bill Payment',
                $lines,
                $payment // Link to the BillPayment model
            );

            // 7. Link Journal Entry back to Payment
            $payment->journal_entry_id = $journalEntry->id;
            $payment->save();

            DB::commit();

            return response()->json($payment->load('supplier', 'bill'), 201);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Failed to create bill payment for company {$companyId}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified bill payment.
     */
    public function show(BillPayment $billPayment)
    {
        Gate::authorize('view-bills');
        if ($billPayment->company_id !== auth()->user()->company_id) {
            abort(403);
        }

        return response()->json(
            $billPayment->load(['supplier', 'bill', 'journalEntry.lines.account'])
        );
    }

    /**
     * Delete a payment and reverse its associated transactions.
     */
    public function destroy(BillPayment $billPayment)
    {
        Gate::authorize('manage-bills'); // Or a 'delete-payments' permission
        if ($billPayment->company_id !== auth()->user()->company_id) {
            abort(403);
        }

        DB::beginTransaction();
        try {
            $paymentAmount = $billPayment->amount;

            // 1. Reverse the bill's balance (if linked)
            if ($billPayment->supplier_bill_id) {
                $bill = SupplierBill::lockForUpdate()->find($billPayment->supplier_bill_id);
                if ($bill) {
                    $bill->amount_paid = $bill->amount_paid - $paymentAmount;
                    $bill->balance_due = $bill->balance_due + $paymentAmount;

                    // Revert status
                    if ($bill->balance_due >= $bill->amount) {
                        $bill->status = 'Posted'; // Back to fully open
                    } else {
                        $bill->status = 'Partially Paid';
                    }
                    $bill->save();
                }
            }

            // 2. Delete the associated Journal Entry (Header and Lines)
            if ($billPayment->journal_entry_id) {
                $je = JournalEntry::find($billPayment->journal_entry_id);
                if ($je) {
                    // Note: JournalEntry model should have a deleting boot method
                    // to cascade delete its lines. If not, delete lines first.
                    $je->lines()->delete();
                    $je->delete();
                }
            }

            // 3. Delete the payment itself (Soft Delete)
            $billPayment->delete();

            DB::commit();

            return response()->json(['message' => 'Bill payment and associated journal entry have been reversed.'], 200);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Failed to delete bill payment {$billPayment->id}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to delete payment.'], 500);
        }
    }
}
