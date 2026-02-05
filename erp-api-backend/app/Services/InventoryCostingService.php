<?php

namespace App\Services;

use App\Models\Inventory\Product;
use App\Models\Inventory\ProductCostLayer;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntry; // Required for type hinting/creation
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;
use Carbon\Carbon; // ⬅️ Must be imported

class InventoryCostingService
{
    protected JournalEntryService $journalEntryService;

    public function __construct(JournalEntryService $journalEntryService)
    {
        $this->journalEntryService = $journalEntryService;
    }

    /**
     * Records a new incoming stock quantity and unit cost.
     * Updates Product model and Cost Layers.
     */
    public function recordPurchaseCost(Product $product, float $quantity, float $unitCost): Product
    {
        DB::beginTransaction();
        try {
            $product->stock += $quantity;

            if ($product->costing_method === 'WAC') {
                // Calculate new Weighted Average Cost (WAC)
                $oldTotalValue = $product->current_avg_cost * ($product->stock - $quantity);
                $newTotalValue = $oldTotalValue + ($quantity * $unitCost);
                // Ensure stock is not zero before division
                $product->current_avg_cost = ($product->stock > 0) ? ($newTotalValue / $product->stock) : 0;

            } elseif ($product->costing_method === 'FIFO') {
                // Create a new FIFO Cost Layer
                ProductCostLayer::create([
                    'product_id' => $product->id,
                    'cost' => $unitCost,
                    'quantity_in' => $quantity,
                    'quantity_out' => 0,
                    'remaining_quantity' => $quantity,
                    'purchase_date' => Carbon::now()->toDateString(),
                ]);
            }

            $product->save();
            DB::commit();
            return $product;

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("Failed to record cost for product {$product->id}: " . $e->getMessage());
            throw new \Exception("Inventory costing update failed: " . $e->getMessage());
        }
    }


    /**
     * Calculates COGS and posts the Journal Entry for a sale.
     */
    public function calculateCogsAndDeplete(int $companyId, int $productId, float $quantitySold, string $saleDate): float
    {
        $product = Product::where('company_id', $companyId)->findOrFail($productId);

        if ($product->stock < $quantitySold) {
             throw new \Exception("Cannot calculate COGS: Insufficient stock for product {$product->name}.");
        }

        // Skip COGS if the item is a service
        if ($product->is_service) {
            $product->stock -= $quantitySold; // Still decrement stock if required, but COGS is zero
            $product->save();
            return 0.00;
        }

        $totalCogs = 0;
        DB::beginTransaction();
        try {
            if ($product->costing_method === 'WAC') {
                $totalCogs = $quantitySold * $product->current_avg_cost;

            } elseif ($product->costing_method === 'FIFO') {
                $totalCogs = $this->depleteFifoLayers($product, $quantitySold);
            }

            // 1. Post COGS Journal Entry
            $this->postCogsToLedger($companyId, $totalCogs, $product, $quantitySold, $saleDate);

            // 2. Decrement physical stock
            $product->stock -= $quantitySold;
            $product->save();

            DB::commit();
            return $totalCogs;

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error("COGS calculation failed for product {$productId}: " . $e->getMessage());
            // Re-throw the exception to ensure the calling transaction (InvoiceController) rolls back
            throw $e;
        }
    }


    // --- Private FIFO Depletion Helper ---

    /**
     * Depletes inventory layers based on the FIFO method.
     */
    private function depleteFifoLayers(Product $product, float $quantityToDeplete): float
    {
        $cogsTotal = 0;
        $remaining = $quantityToDeplete;

        // Fetch cost layers ordered by purchase date (FIFO: Oldest first)
        $layers = ProductCostLayer::where('product_id', $product->id)
            ->where('remaining_quantity', '>', 0)
            ->orderBy('purchase_date')
            ->get();

        foreach ($layers as $layer) {
            if ($remaining <= 0) break;

            $canTake = min($remaining, $layer->remaining_quantity);

            $cogsTotal += $canTake * $layer->cost;
            $remaining -= $canTake;

            // Update the layer: quantity out and remaining quantity
            $layer->quantity_out += $canTake;
            $layer->remaining_quantity -= $canTake;
            $layer->save();
        }

        if ($remaining > 0) {
             throw new \Exception("FIFO Depletion Error: Failed to find {$remaining} units in cost layers.");
        }

        return round($cogsTotal, 2);
    }

    // --- Private GL Posting Helper ---

    /**
     * Posts the COGS entry to the General Ledger.
     */
    private function postCogsToLedger(int $companyId, float $cogsAmount, Product $product, float $quantitySold, string $saleDate)
    {
        if ($cogsAmount < 0.01) return; // Skip JE if COGS is zero

        // 1. Find GL Accounts
        $cogsAccount = ChartOfAccount::getAccountIdByCode('5000', $companyId); // Standard COGS Code
        $inventoryAssetAccount = ChartOfAccount::getAccountIdByCode('1400', $companyId); // Standard Inventory Asset Code

        if (!$cogsAccount || !$inventoryAssetAccount) {
            throw new \Exception("Critical GL accounts (COGS: 5000 or Inventory: 1400) not found.");
        }

        $jeLines = [
            // DEBIT: COGS (Expense increases)
            ['account_id' => $cogsAccount, 'debit' => $cogsAmount, 'credit' => 0, 'line_description' => "COGS for {$product->name} ({$quantitySold} units)"],
            // CREDIT: Inventory Asset (Asset decreases)
            ['account_id' => $inventoryAssetAccount, 'debit' => 0, 'credit' => $cogsAmount, 'line_description' => "Inventory depletion for sale"],
        ];

        // 2. Create Journal Entry
        $this->journalEntryService->createJournalEntry(
            $saleDate,
            "COGS for Sale of {$quantitySold}x {$product->name}",
            'COGS',
            $jeLines
            // related model will be set by the caller (InvoiceController) when linking
        );
    }
}
