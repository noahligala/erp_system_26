<?php

namespace App\Http\Controllers\Accounts;

use App\Http\Controllers\Controller;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\SupplierBill;
use App\Models\Accounts\SupplierBillLine;
use App\Models\Accounts\JournalEntry;
use App\Models\Supplier; // Assuming this is at App\Models based on previous context
use App\Services\JournalEntryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class SupplierBillController extends Controller
{
    /**
     * List all supplier bills.
     */
    public function index(Request $request)
    {
        Gate::authorize('view-bills');

        $query = SupplierBill::with(['supplier:id,name,email'])
            ->where('company_id', auth()->user()->company_id)
            ->latest('bill_date');

        // Filter by status if provided
        if ($request->has('status')) {
            // 💡 --- START OF FIX ---
            // Add special 'unpaid' filter for the payment dialog
            if ($request->status === 'unpaid') {
                $query->whereIn('status', ['Posted', 'Partially Paid', 'Overdue']);
            } else {
                $query->where('status', $request->status);
            }
            // 💡 --- END OF FIX ---
        }

        // Filter by supplier
        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        // 💡 --- START OF FIX ---
        // Allow unpaginated results for dropdowns
        if ($request->input('paginate') === 'false') {
            return response()->json($query->get());
        }
        // 💡 --- END OF FIX ---

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    // ... (store, show, update, destroy, postBillToLedger methods remain unchanged)
    // ... (Paste all your other methods here)

    /**
     * Store a new supplier bill.
     */
    public function store(Request $request, JournalEntryService $journalEntryService)
    {
        Gate::authorize('create-bills'); // Define this permission

        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', Rule::exists('suppliers', 'id')->where('company_id', auth()->user()->company_id)],
            'bill_number' => 'required|string|max:50', // Vendor's invoice #
            'bill_date' => 'required|date_format:Y-m-d',
            'due_date' => 'required|date_format:Y-m-d|after_or_equal:bill_date',
            'notes' => 'nullable|string|max:1000',
            'status' => ['required', Rule::in(['Draft', 'Posted'])], // Only Draft or Posted allowed on creation

            'lines' => 'required|array|min:1',
            // A line must have EITHER a product_id OR a chart_of_account_id
            'lines.*.product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('company_id', auth()->user()->company_id)],
            'lines.*.chart_of_account_id' => ['nullable', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', auth()->user()->company_id)],
            'lines.*.description' => 'required|string|max:255',
            'lines.*.quantity' => 'required|numeric|min:0.01',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

        $companyId = auth()->user()->company_id;

        DB::beginTransaction();
        try {
            // 1. Check Duplicate Bill Number for this Supplier
            $exists = SupplierBill::where('company_id', $companyId)
                ->where('supplier_id', $validated['supplier_id'])
                ->where('bill_number', $validated['bill_number'])
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'A bill with this number already exists for this supplier.'], 422);
            }

            // 2. Calculate Totals
            $totalAmount = 0;
            $linesData = [];

            foreach ($validated['lines'] as $line) {
                $subtotal = round($line['quantity'] * $line['unit_price'], 2);
                $totalAmount += $subtotal;

                $linesData[] = [
                    'product_id' => $line['product_id'] ?? null,
                    'chart_of_account_id' => $line['chart_of_account_id'] ?? null,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'subtotal' => $subtotal,
                ];
            }

            // 3. Create Bill Header
            $bill = SupplierBill::create([
                'company_id' => $companyId,
                'supplier_id' => $validated['supplier_id'],
                'bill_number' => $validated['bill_number'],
                'bill_date' => $validated['bill_date'],
                'due_date' => $validated['due_date'],
                'amount' => $totalAmount,
                'amount_paid' => 0,
                'balance_due' => $totalAmount,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // 4. Create Lines
            $bill->lines()->createMany($linesData);

            // 5. Handle Accounting (If Posted)
            if ($bill->status === 'Posted') {
                $this->postBillToLedger($bill, $journalEntryService);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Bill created successfully.',
                'data' => $bill->load('lines.product', 'lines.account'),
            ], 201);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to create supplier bill: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage() ?: 'Failed to create bill.'
            ], 500);
        }
    }

    /**
     * Show a specific bill.
     */
    public function show(SupplierBill $bill)
    {
        // Ensure correct namespace for SupplierBill in binding or logic
        if ($bill->company_id !== auth()->user()->company_id) {
            abort(403);
        }
        return response()->json($bill->load('lines.product', 'lines.account', 'supplier'));
    }

    /**
     * Update a bill (Only if Draft).
     */
    public function update(Request $request, SupplierBill $bill, JournalEntryService $journalEntryService)
    {
        Gate::authorize('manage-bills');

        if ($bill->company_id !== auth()->user()->company_id) abort(403);

        // Strict Rule: Cannot edit financial details if already Posted or Paid
        if ($bill->status !== 'Draft') {
            return response()->json(['message' => 'Cannot edit a bill after it has been posted. You must void/delete it and recreate.'], 422);
        }

        $validated = $request->validate([
            'bill_number' => 'required|string|max:50',
            'bill_date' => 'required|date_format:Y-m-d',
            'due_date' => 'required|date_format:Y-m-d|after_or_equal:bill_date',
            'notes' => 'nullable|string|max:1000',
            'status' => ['required', Rule::in(['Draft', 'Posted'])],
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('company_id', $bill->company_id)],
            'lines.*.chart_of_account_id' => ['nullable', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $bill->company_id)],
            'lines.*.description' => 'required|string|max:255',
            'lines.*.quantity' => 'required|numeric|min:0.01',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // 1. Recalculate Totals
            $totalAmount = 0;
            $linesData = [];

            foreach ($validated['lines'] as $line) {
                $subtotal = round($line['quantity'] * $line['unit_price'], 2);
                $totalAmount += $subtotal;
                $linesData[] = [
                    'product_id' => $line['product_id'] ?? null,
                    'chart_of_account_id' => $line['chart_of_account_id'] ?? null,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'subtotal' => $subtotal,
                ];
            }

            // 2. Update Header
            $bill->update([
                'bill_number' => $validated['bill_number'],
                'bill_date' => $validated['bill_date'],
                'due_date' => $validated['due_date'],
                'amount' => $totalAmount,
                'balance_due' => $totalAmount - $bill->amount_paid,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? $bill->notes,
            ]);

            // 3. Replace Lines
            $bill->lines()->delete();
            $bill->lines()->createMany($linesData);

            // 4. Handle Accounting if status changed to Posted
            if ($validated['status'] === 'Posted') {
                $this->postBillToLedger($bill, $journalEntryService);
            }

            DB::commit();
            return response()->json([
                'status' => 'success',
                'message' => 'Bill updated successfully.',
                'data' => $bill->load('lines')
            ]);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Failed to update bill: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a bill.
     */
    public function destroy(SupplierBill $bill)
    {
        Gate::authorize('manage-bills');
        if ($bill->company_id !== auth()->user()->company_id) abort(403);

        // Prevent deleting if payments exist
        if ($bill->amount_paid > 0) {
            return response()->json(['message' => 'Cannot delete a bill that has payments attached.'], 422);
        }

        DB::beginTransaction();
        try {
            // If there's a linked journal entry (via a linking table or manual check), we should reverse it.
            // Note: The current migration didn't add 'journal_entry_id' to 'supplier_bills',
            // relying on the JournalEntry 'referenceable' polymorphic relationship instead.

            JournalEntry::where('referenceable_type', SupplierBill::class)
                ->where('referenceable_id', $bill->id)
                ->delete(); // Soft delete the JE if exists

            $bill->lines()->delete();
            $bill->delete(); // Soft delete bill

            DB::commit();
            return response()->json(['message' => 'Bill deleted successfully.']);
        } catch (Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete bill.'], 500);
        }
    }

    /**
     * Helper: Post Bill to General Ledger
     */
    protected function postBillToLedger(SupplierBill $bill, JournalEntryService $journalEntryService)
    {
        $companyId = $bill->company_id;

        // 1. Identify Credit Account (Accounts Payable)
        // Usually code 2010 or 2000
        $apAccount = ChartOfAccount::where('company_id', $companyId)
            ->where(function($q) {
                $q->where('account_code', '2010')
                  ->orWhere('account_name', 'like', '%Accounts Payable%');
            })
            ->first();

        if (!$apAccount) {
            throw new \Exception("Accounts Payable account (2010) not found. Please configure Chart of Accounts.");
        }

        // 2. Identify Debit Accounts (Inventory or Expenses)
        // Get default Inventory account just in case a product doesn't link specific GL
        $inventoryAccount = ChartOfAccount::where('company_id', $companyId)
            ->where(function($q) {
                $q->where('account_code', '1400')
                  ->orWhere('account_name', 'like', '%Inventory%');
            })
            ->first();

        $jeLines = [];

        // Loop through bill lines to build Debits
        foreach ($bill->lines as $line) {
            $debitAccountId = null;

            if ($line->chart_of_account_id) {
                // Direct expense assignment
                $debitAccountId = $line->chart_of_account_id;
            } elseif ($line->product_id) {
                // Product purchase -> Inventory Asset
                if (!$inventoryAccount) {
                    throw new \Exception("Inventory account (1400) missing for product line items.");
                }
                $debitAccountId = $inventoryAccount->id;
            } else {
                // Fallback (should be caught by validation)
                throw new \Exception("Bill line missing allocation account.");
            }

            $jeLines[] = [
                'account_id' => $debitAccountId,
                'debit' => $line->subtotal,
                'credit' => 0,
                'line_description' => $line->description
            ];
        }

        // Add the Credit Line (Total to AP)
        $jeLines[] = [
            'account_id' => $apAccount->id,
            'debit' => 0,
            'credit' => $bill->amount,
            'line_description' => "Bill #{$bill->bill_number} from " . $bill->supplier->name
        ];

        // 3. Create the Journal Entry
        $journalEntryService->createJournalEntry(
            $bill->bill_date,
            "Supplier Bill #{$bill->bill_number} - {$bill->supplier->name}",
            'Bill', // Source
            $jeLines,
            $bill // Link polymorphic relationship
        );
    }
}
