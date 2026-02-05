<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\Invoice;
use App\Models\Accounts\JournalEntry;
use App\Models\Accounts\CustomerPayment;
use App\Models\CRM\Customer;
use App\Services\JournalEntryService;
use App\Services\InventoryCostingService; // ⬅️ NEW IMPORT
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class InvoiceController extends Controller
{
    protected JournalEntryService $journalEntryService;
    protected InventoryCostingService $costingService; // ⬅️ NEW PROPERTY

    public function __construct(JournalEntryService $journalEntryService, InventoryCostingService $costingService)
    {
        $this->journalEntryService = $journalEntryService;
        $this->costingService = $costingService; // ⬅️ ASSIGN SERVICE
    }

    /**
     * Store a newly created invoice in storage.
     */
    public function store(Request $request)
    {
        Log::debug("InvoiceController@store hit by User ID: " . auth()->id());
        Gate::authorize('create-invoices');

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', Rule::exists('customers', 'id')->where('company_id', auth()->user()->company_id)],
            'customer_info' => 'nullable|array',
            'customer_info.name' => 'required_without:customer_id|string|max:255',
            'customer_info.email' => 'nullable|email|max:255',
            'customer_info.phone' => 'nullable|string|max:50',
            'customer_info.save' => 'nullable|boolean',
            'invoice_date' => 'required|date_format:Y-m-d',
            'due_date' => 'required|date_format:Y-m-d|after_or_equal:invoice_date',
            'notes' => 'nullable|string|max:2000',
            'status' => ['required', Rule::in(['Draft', 'Sent', 'Paid', 'Partially Paid'])],
            'amount_paid' => 'nullable|numeric|min:0',
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('company_id', auth()->user()->company_id)],
            'lines.*.description' => 'required|string|max:255',
            'lines.*.quantity' => 'required|numeric|min:0.01',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

        $companyId = auth()->user()->company_id;
        $subTotal = 0;
        $invoiceLinesData = [];
        $invoice = null;
        $inventoryLinesSold = []; // ⬅️ NEW: To track inventory for COGS

        DB::beginTransaction();
        try {
            // ---------------- CREATE CUSTOMER IF NEEDED ----------------
            $customerId = $validated['customer_id'] ?? null;
            if (!$customerId && isset($validated['customer_info'])) {
                $info = $validated['customer_info'];
                if (!isset($info['save']) || $info['save'] === true) {
                    $customer = Customer::create([
                        'company_id' => $companyId,
                        'name' => $info['name'],
                        'email' => $info['email'] ?? null,
                        'phone' => $info['phone'] ?? null,
                    ]);
                    $customerId = $customer->id;
                    Log::debug("New customer created: {$customerId}");
                }
            }

            // ---------------- 💡 PRE-LOAD PRODUCTS FOR SERVICE CHECK 💡 ----------------
            // Collect all product IDs from the lines to fetch them in one query
            $productIds = collect($validated['lines'])
                ->pluck('product_id')
                ->filter() // Remove nulls
                ->unique()
                ->toArray();

            // Fetch products and key them by their ID for easy lookup
            $products = Product::whereIn('id', $productIds)
                ->where('company_id', $companyId)
                ->get()
                ->keyBy('id');


            // ---------------- CALCULATE LINES AND SUBTOTAL ----------------
            foreach ($validated['lines'] as $line) {
                $amount = round($line['quantity'] * $line['unit_price'], 2);
                $subTotal += $amount;
                $invoiceLinesData[] = [
                    'product_id' => $line['product_id'] ?? null,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'amount' => $amount,
                ];

                // ⬅️ MODIFIED: Collect inventory items ONLY if they are goods (not services)
                if (!empty($line['product_id'])) {
                    $product = $products->get($line['product_id']);

                    // Check if product exists and is NOT a service before adding to depletion queue
                    if ($product && !$product->is_service) {
                        $inventoryLinesSold[] = [
                            'product_id' => $line['product_id'],
                            'quantity' => $line['quantity'],
                        ];
                        Log::debug("Queueing product ID {$line['product_id']} for inventory depletion.");
                    } else {
                        Log::debug("Skipping inventory depletion for product ID {$line['product_id']} (Service or not found).");
                    }
                }
            }

           // ---------------- BALANCE CALCULATION ----------------
            $amountPaid = (float) ($validated['amount_paid'] ?? 0);

            if ($validated['status'] === 'Paid') {
                $amountPaid = $totalAmount;
            } elseif (in_array($validated['status'], ['Draft', 'Sent'])) {
                 $amountPaid = 0;
            }
            $balanceDue = $totalAmount - $amountPaid;

            // ---------------- CREATE INVOICE ----------------
            $invoice = Invoice::create([
                'company_id' => $companyId,
                'customer_id' => $customerId,
                'invoice_number' => Invoice::generateInvoiceNumber($companyId),
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'sub_total' => round($subTotal, 2),
                'tax_amount' => round($taxAmount, 2),
                'total_amount' => $totalAmount,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'amount_paid' => $amountPaid,
                'balance_due' => $balanceDue,
            ]);

            $invoice->lines()->createMany($invoiceLinesData);
            Log::debug("Invoice #{$invoice->id} and lines created with Balance Due: {$balanceDue}");

            // ---------------- CREATE SALES JOURNAL ENTRY (DEBIT A/R, CREDIT SALES) ----------------
            if ($invoice->status !== 'Draft') {
                // JE (Debit A/R, Credit Sales)
                $customerName = $customerId ? Customer::find($customerId)->name : 'Anonymous Customer';
                $jeDescription = "Invoice #{$invoice->invoice_number} issued to {$customerName}";
                $arAccountId = ChartOfAccount::getAccountIdByCode('1100', $companyId);
                $salesAccountId = ChartOfAccount::getAccountIdByCode('4000', $companyId);

                if (!$arAccountId || !$salesAccountId) {
                    throw new \Exception("Critical accounts (AR: 1100 or Sales: 4000) not found.");
                }
                $jeLines = [
                    ['account_id' => $arAccountId, 'debit' => $invoice->total_amount, 'credit' => 0],
                    ['account_id' => $salesAccountId, 'debit' => 0, 'credit' => $invoice->sub_total],
                ];
                $this->journalEntryService->createJournalEntry(
                    $invoice->invoice_date, $jeDescription, 'Invoice', $jeLines, $invoice
                );
                Log::debug("Sales Journal Entry created for Invoice #{$invoice->id}.");

                // 🚨 NEW STEP: Post COGS and deplete inventory for each product line 🚨
                foreach ($inventoryLinesSold as $line) {
                    // This service call handles inventory deduction and posts the COGS JE
                    $this->costingService->calculateCogsAndDeplete(
                        $companyId,
                        $line['product_id'],
                        $line['quantity'],
                        $invoice->invoice_date // Use invoice date as sale date
                    );
                }
                Log::debug("COGS and Stock depletion posted for Invoice #{$invoice->id}.");
            }

            // ---------------- CREATE PAYMENT IF 'Paid' OR 'Partially Paid' ----------------
            if ($invoice->amount_paid > 0 && in_array($invoice->status, ['Paid', 'Partially Paid'])) {
                Log::debug("Invoice created as '{$invoice->status}'. Auto-creating payment for Invoice #{$invoice->id}.");
                $payment = CustomerPayment::create([
                    'company_id' => $companyId,
                    'customer_id' => $invoice->customer_id,
                    'invoice_id' => $invoice->id,
                    'payment_date' => $invoice->invoice_date,
                    'method' => 'Cash',
                    'reference' => 'Paid upon creation',
                    'amount' => $invoice->amount_paid,
                    'created_by' => auth()->id(),
                    // Note: Need to set cash_account_id if auto-payment occurs, usually a default cash account
                    // 'cash_account_id' => ChartOfAccount::getAccountIdByCode('1000', $companyId),
                ]);

                try {
                    $this->postPaymentToLedger($payment, $invoice, $this->journalEntryService); // Use class property
                    Log::debug("Payment Journal Entry created for Invoice #{$invoice->id}.");
                } catch (Throwable $e) {
                    throw new \Exception("Invoice saved, but failed to post auto-payment: " . $e->getMessage());
                }
            }

            DB::commit();

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to create invoice/COGS: ' . $e->getMessage() . ' Stack: ' . $e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage() ?: 'Failed to create invoice. Check logs.'
            ], 500);
        }

        $freshInvoice = Invoice::with('lines', 'customer:id,name,email,phone')
                            ->find($invoice->id);

        Log::debug("Returning invoice data with Balance Due: {$freshInvoice->balance_due}");

        $recentInvoices = Invoice::with('customer:id,name')
            ->where('company_id', $companyId)
            ->latest('invoice_date')
            ->limit(10)
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Invoice created successfully.',
            'data' => $freshInvoice,
            'recent' => $recentInvoices,
        ], 201);
    }

    public function index(Request $request)
    {
        Gate::authorize('view-invoices');
        $invoices = Invoice::with('customer:id,name,email,phone')
            ->where('company_id', auth()->user()->company_id)
            ->latest('invoice_date')
            ->paginate($request->get('per_page', 20));
        return response()->json($invoices);
    }
    public function recent()
    {
        Gate::authorize('view-invoices');
        $recentInvoices = Invoice::with('customer:id,name')
            ->where('company_id', auth()->user()->company_id)
            ->latest('invoice_date')
            ->limit(10)
            ->get();
        return response()->json($recentInvoices);
    }
    public function show(Invoice $invoice)
    {
        Gate::authorize('view', $invoice);
        return response()->json($invoice->load('lines', 'customer:id,name,email,phone'));
    }


    /**
     * Update invoice.
     */
    public function update(Request $request, Invoice $invoice, JournalEntryService $journalEntryService)
    {
        Gate::authorize('update', $invoice);

        $originalStatus = $invoice->status;

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', Rule::exists('customers', 'id')->where('company_id', auth()->user()->company_id)],
            'invoice_date' => 'required|date_format:Y-m-d',
            'due_date' => 'required|date_format:Y-m-d|after_or_equal:invoice_date',
            'notes' => 'nullable|string|max:2000',
            'status' => ['required', Rule::in(['Draft', 'Sent', 'Paid', 'Partially Paid'])],
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('company_id', auth()->user()->company_id)],
            'lines.*.description' => 'required|string|max:255',
            'lines.*.quantity' => 'required|numeric|min:0.01',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Recalculate totals first
            $subTotal = 0;
            $invoiceLinesData = [];
            foreach ($validated['lines'] as $line) {
                $amount = round($line['quantity'] * $line['unit_price'], 2);
                $subTotal += $amount;
                $invoiceLinesData[] = [
                    'product_id' => $line['product_id'] ?? null,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'amount' => $amount,
                ];
            }

            $totalAmount = $subTotal; // Assume tax is 0 for now

            // Logic to prevent changing status *unless* it's a Draft
            $newStatus = $validated['status'];
            if ($originalStatus !== 'Draft') {
                $newStatus = $originalStatus; // Lock status if not a draft
            }

            // Recalculate balance based on new total and EXISTING paid amount
            $balanceDue = $totalAmount - $invoice->amount_paid;

            // Auto-update status if balance becomes 0
            if ($originalStatus !== 'Draft' && $balanceDue <= 0) {
                 $newStatus = 'Paid';
            }

            // Update invoice main fields
            $invoice->update([
                'customer_id' => $validated['customer_id'] ?? $invoice->customer_id,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'notes' => $validated['notes'] ?? $invoice->notes,
                'status' => $newStatus, // Use corrected status
                'sub_total' => $subTotal,
                'tax_amount' => 0,
                'total_amount' => $totalAmount,
                'balance_due' => $balanceDue, // Use recalculated balance
            ]);

            // Remove existing lines and recreate
            $invoice->lines()->delete();
            $invoice->lines()->createMany($invoiceLinesData);


            // --- Add Journal Entry logic to the update method ---
            $isNowPosted = in_array($newStatus, ['Sent', 'Paid', 'Partially Paid']);

            if ($originalStatus === 'Draft' && $isNowPosted) {
                $jeAlreadyExists = JournalEntry::where('referenceable_type', Invoice::class)
                                                ->where('referenceable_id', $invoice->id)
                                                ->exists();
                if (!$jeAlreadyExists) {
                    $customerName = $invoice->customer ? $invoice->customer->name : 'Anonymous Customer';
                    $jeDescription = "Invoice #{$invoice->invoice_number} issued to {$customerName}";
                    $arAccountId = ChartOfAccount::getAccountIdByCode('1100', $invoice->company_id);
                    $salesAccountId = ChartOfAccount::getAccountIdByCode('4000', $invoice->company_id);

                    if (!$arAccountId || !$salesAccountId) {
                        throw new \Exception("Critical accounts (AR: 1100 or Sales: 4000) not found.");
                    }
                    $jeLines = [
                        ['account_id' => $arAccountId, 'debit' => $invoice->total_amount, 'credit' => 0],
                        ['account_id' => $salesAccountId, 'debit' => 0, 'credit' => $invoice->sub_total],
                    ];
                    $journalEntryService->createJournalEntry(
                        $invoice->invoice_date, $jeDescription, 'Invoice', $jeLines, $invoice
                    );
                    Log::debug("Journal Entry created for updated Invoice #{$invoice->id}.");
                }
            }

            // 🚨 COGS IS NOT HANDLED ON UPDATE YET, leaving it out for now.
            // If the invoice was updated/re-posted, COGS recalculation would be needed here too.

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Invoice updated successfully.',
                'data' => $invoice->load('lines', 'customer:id,name,email,phone')
            ], 200);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to update invoice: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage() ?: 'Failed to update invoice.'
            ], 500);
        }
    }

    /**
     * Helper: Checks and corrects balance_due and status for all existing invoices.
     */
    public function recalculateBalances()
    {
        Gate::authorize('manage-financial-data'); // FIX: Use existing permission

        $companyId = auth()->user()->company_id;
        $invoices = Invoice::where('company_id', $companyId)->get();
        $updatesCount = 0;

        Log::info("Starting balance recalculation for {$invoices->count()} invoices in company {$companyId}.");

        DB::beginTransaction();
        try {
            foreach ($invoices as $invoice) {

                $originalBalance = (float) $invoice->balance_due;
                $originalStatus = $invoice->status;

                // 1. Recalculate true balance due
                $newBalanceDue = max($invoice->total_amount - $invoice->amount_paid, 0.00);

                // 2. Determine correct status based on new balance
                $newStatus = $originalStatus;

                if (abs($newBalanceDue) < 0.01) {
                    $newStatus = 'Paid';
                    $newBalanceDue = 0.00; // Ensure clean zero
                } elseif ($invoice->amount_paid > 0) {
                    $newStatus = 'Partially Paid';
                } elseif ($invoice->total_amount > 0 && $invoice->amount_paid == 0) {
                    // Check if it should be 'Sent' (if it wasn't a draft) or 'Unpaid'/'Posted'
                    if ($originalStatus !== 'Draft') {
                        $newStatus = 'Posted';
                    } else {
                        $newStatus = 'Draft';
                    }
                }

                // 3. Apply update only if a change occurred in balance or status
                if (abs($originalBalance - $newBalanceDue) > 0.01 || $originalStatus !== $newStatus) {
                    $invoice->balance_due = $newBalanceDue;
                    $invoice->status = $newStatus;
                    $invoice->save();
                    $updatesCount++;
                }
            }

            DB::commit();
            Log::info("Completed invoice balance recalculation. Total updated: {$updatesCount}.");

            return response()->json([
                'status' => 'success',
                'message' => "Successfully checked and updated {$updatesCount} invoices for data integrity.",
                'total_updated' => $updatesCount
            ]);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Invoice balance recalculation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Data integrity check failed.'], 500);
        }
    }

    /**
     * Delete invoice.
     */
    public function destroy(Invoice $invoice)
    {
        Gate::authorize('delete', $invoice);
        if ($invoice->amount_paid > 0) {
            return response()->json(['message' => 'Cannot delete an invoice that has payments.'], 422);
        }
        DB::beginTransaction();
        try {
            JournalEntry::where('referenceable_type', Invoice::class)
                        ->where('referenceable_id', $invoice->id)
                        ->delete();
            $invoice->lines()->delete();
            $invoice->delete();
            DB::commit();
            return response()->json(['message' => 'Invoice deleted successfully.']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to delete invoice: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete invoice.'], 500);
        }
    }
    public function payments($invoiceId)
    {
        $invoice = Invoice::with(['customerPayments'])->findOrFail($invoiceId);
        Gate::authorize('view', $invoice);
        return response()->json($invoice->customerPayments);
    }
    protected function postPaymentToLedger(CustomerPayment $payment, Invoice $invoice, JournalEntryService $journalEntryService)
    {
        $companyId = $payment->company_id;
        $cashOrBankAccount = ChartOfAccount::where('company_id', $companyId)
            ->where('account_name', 'Cash')
            ->first();
        if (!$cashOrBankAccount) {
             $cashOrBankAccount = ChartOfAccount::where('company_id', $companyId)
                ->where('account_type', 'Asset')
                ->where('account_name', 'like', '%Bank%')
                ->first();
        }
        $arAccountId = ChartOfAccount::getAccountIdByCode('1100', $companyId);
        if (!$cashOrBankAccount || !$arAccountId) {
            $missing = [];
            if (!$cashOrBankAccount) $missing[] = 'Cash/Bank Account';
            if (!$arAccountId) $missing[] = 'Accounts Receivable (1100)';
            throw new \Exception("Missing GL accounts for payment posting: " . implode(', ', $missing));
        }
        $lines = [
            [
                'account_id' => $cashOrBankAccount->id,
                'debit' => $payment->amount,
                'credit' => 0,
            ],
            [
                'account_id' => $arAccountId,
                'debit' => 0,
                'credit' => $payment->amount,
            ],
        ];
        $description = "Payment received for Invoice #{$invoice->invoice_number} ({$payment->method})";
        $journalEntry = $journalEntryService->createJournalEntry(
            $payment->payment_date, $description, 'Customer Payment', $lines, $invoice
        );
        if ($journalEntry) {
            $payment->journal_entry_id = $journalEntry->id;
            $payment->save();
        }
    }
}
