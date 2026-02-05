<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Inventory\Product;
use App\Models\Inventory\StockAdjustment;
use App\Services\JournalEntryService;
use App\Services\InventoryCostingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class StockAdjustmentController extends Controller
{
    protected JournalEntryService $journalEntryService;
    protected InventoryCostingService $costingService;

    public function __construct(JournalEntryService $journalEntryService, InventoryCostingService $costingService)
    {
        $this->journalEntryService = $journalEntryService;
        $this->costingService = $costingService;
    }

    /**
     * List all stock adjustments.
     */
    public function index(Request $request)
    {
        Gate::authorize('manage-inventory');

        $adjustments = StockAdjustment::where('company_id', auth()->user()->company_id)
            ->with(['product:id,name', 'adjustmentAccount:id,account_code,account_name'])
            ->latest('adjustment_date')
            ->paginate($request->get('per_page', 20));

        return response()->json($adjustments);
    }

    /**
     * Store a new stock adjustment (Shrinkage or Overage).
     */
    public function store(Request $request)
    {
        Gate::authorize('manage-inventory');

        $companyId = auth()->user()->company_id;
        $userId = auth()->id();

        $validated = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('company_id', $companyId)],
            'adjustment_date' => 'required|date_format:Y-m-d',
            'quantity_change' => 'required|numeric|not_in:0', // Can be positive (gain) or negative (loss)
            'reason' => 'required|string|max:255',
            'adjustment_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')->where('company_id', $companyId)],
        ]);

        $product = Product::lockForUpdate()->findOrFail($validated['product_id']);

        Log::info("Stock Adjustment attempt for Product {$product->id} ('{$product->name}').", [
            'input_qty' => $validated['quantity_change'],
            'current_stock' => $product->current_stock,
            'current_avg_cost' => $product->current_avg_cost,
        ]);

        if ($product->is_service) {
             return response()->json(['message' => 'Cannot adjust stock for service items.'], 422);
        }

        // CRITICAL CHECK: Ensure product has a cost recorded before financial adjustment
        if ($product->current_avg_cost <= 0) {
            Log::warning("Adjustment Failed: current_avg_cost is zero or less.");
             return response()->json(['message' => "Cannot adjust stock value. Product '{$product->name}' must have a cost (current_avg_cost > 0) recorded from a purchase before adjustment."], 422);
        }

        DB::beginTransaction();
        try {
            $quantityChange = (float) $validated['quantity_change'];
            $isShrinkage = $quantityChange < 0;
            $unitCost = $product->current_avg_cost;

            // FIX 1: Use $product->current_stock for stock validation check
            if ($isShrinkage && ($product->current_stock + $quantityChange) < 0) {
                 Log::warning("Adjustment Failed: Negative stock check failed.");
                 throw new \Exception("Cannot reduce stock by {$quantityChange} units; stock would become negative.");
            }

            // 1. Calculate Adjustment Value (The financial impact)
            $adjustmentValue = abs($quantityChange) * $unitCost;
            $adjustmentValue = round($adjustmentValue, 2);

            Log::debug("Calculated Adjustment Value: {$adjustmentValue}. Unit Cost: {$unitCost}");


            // 2. Create Adjustment Record (before GL posting)
            $adjustment = StockAdjustment::create([
                ...$validated,
                'company_id' => $companyId,
                'created_by' => $userId,
                'unit_cost' => $unitCost,
                'adjustment_value' => $adjustmentValue,
            ]);
            Log::info("Adjustment record created (ID: {$adjustment->id}).");


            // 3. Update Product Stock (Physical change)
            // FIX 2: Use $product->current_stock for update
            $product->current_stock += $quantityChange;
            $product->save();
            Log::info("Product stock updated to: {$product->current_stock}.");


            // 4. Post Journal Entry (GL Impact) - Only if value is significant
            if ($adjustmentValue >= 0.01) {
                $this->postAdjustmentToLedger($adjustment, $product, $quantityChange, $unitCost);
                Log::info("Journal Entry posted successfully for adjustment {$adjustment->id}.");
            } else {
                Log::warning("Skipping GL post for Stock Adjustment {$adjustment->id}. Value is negligible (0.00).");
            }

            DB::commit();

            return response()->json([
                'message' => 'Stock adjustment recorded successfully.',
                'data' => $adjustment->load('product', 'adjustmentAccount'),
            ], 201);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Stock adjustment failed (Transaction Rollback): ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper: Posts the Inventory Adjustment JE to the General Ledger.
     */
    protected function postAdjustmentToLedger(StockAdjustment $adjustment, Product $product, float $quantityChange, float $unitCost)
    {
        $companyId = $adjustment->company_id;
        $adjustmentAmount = $adjustment->adjustment_value;

        // Find Inventory Asset Account (Standard 1400)
        $inventoryAssetAccount = ChartOfAccount::getAccountIdByCode('1400', $companyId);

        if (!$inventoryAssetAccount) {
            throw new \Exception("Critical GL account (Inventory Asset: 1400) not found.");
        }

        $isGain = $quantityChange > 0; // Stock increased (Overage/Gain)

        // JE always involves the Inventory Asset account (1400) and the specific Adjustment GL account (Loss/Gain)
        if ($isGain) {
            // Inventory Overage (Asset increases, Credit Gain Account/Other Revenue)
            $jeLines = [
                // DEBIT: Inventory Asset (Asset increases)
                ['account_id' => $inventoryAssetAccount, 'debit' => $adjustmentAmount, 'credit' => 0, 'line_description' => "Inventory Overage (Gain)"],
                // CREDIT: Adjustment Account (Other Revenue/Gain increases)
                ['account_id' => $adjustment->adjustment_account_id, 'debit' => 0, 'credit' => $adjustmentAmount, 'line_description' => "Overage of {$product->name}"],
            ];
        } else {
            // Inventory Shrinkage/Loss (Debit Loss Account/Expense, Credit Inventory Asset)
            $jeLines = [
                // DEBIT: Adjustment Account (Expense/Loss increases)
                ['account_id' => $adjustment->adjustment_account_id, 'debit' => $adjustmentAmount, 'credit' => 0, 'line_description' => "Loss due to {$adjustment->reason}"],
                // CREDIT: Inventory Asset (Asset decreases)
                ['account_id' => $inventoryAssetAccount, 'debit' => 0, 'credit' => $adjustmentAmount, 'line_description' => "Shrinkage of {$product->name}"],
            ];
        }

        $journalEntry = $this->journalEntryService->createJournalEntry(
            $adjustment->adjustment_date,
            "Stock Adjustment: {$adjustment->reason} for {$product->name}",
            'Stock Adjustment',
            $jeLines,
            $adjustment // Link polymorphic relationship
        );

        // Link JE back to the adjustment record
        $adjustment->journal_entry_id = $journalEntry->id;
        $adjustment->save();
    }
}
