<?php

namespace App\Http\Controllers\Purchasing;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\Inventory\Product;
use App\Models\Inventory\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class PurchaseOrderController extends Controller
{
    use AuthorizesRequests;

    public function index()
    {
        $this->authorize('viewAny', PurchaseOrder::class);
        $orders = PurchaseOrder::where('company_id', auth()->user()->company_id)
            ->with(['supplier', 'user', 'items.product'])
            ->get();
        return response()->json($orders);
    }

    public function store(Request $request)
    {
        $this->authorize('create', PurchaseOrder::class);
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', Rule::exists('suppliers', 'id')->where('company_id', $companyId)],
            'order_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:order_date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('company_id', $companyId)],
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        try {
            $purchaseOrder = DB::transaction(function () use ($validated, $companyId) {
                $order = PurchaseOrder::create([
                    'company_id' => $companyId,
                    'supplier_id' => $validated['supplier_id'],
                    'user_id' => auth()->id(),
                    'po_number' => 'PO-' . time(), // Simple PO number generation
                    'order_date' => $validated['order_date'],
                    'status' => 'DRAFT', // All new orders start as a draft
                ]);

                $totalAmount = 0;
                foreach ($validated['items'] as $item) {
                    $subtotal = $item['quantity'] * $item['unit_cost'];
                    $order->items()->create([
                        'company_id' => $companyId,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'unit_cost' => $item['unit_cost'],
                        'subtotal' => $subtotal,
                    ]);
                    $totalAmount += $subtotal;
                }

                $order->total_amount = $totalAmount;
                $order->save();

                return $order;
            });

            return response()->json($purchaseOrder->load(['supplier', 'items.product']), 201);
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred while creating the purchase order.'], 500);
        }
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $this->authorize('view', $purchaseOrder);
        return response()->json($purchaseOrder->load(['supplier', 'user', 'items.product']));
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('update', $purchaseOrder);

        $validated = $request->validate([
            'status' => 'required|string|in:SUBMITTED,RECEIVED,CANCELLED',
        ]);

        try {
            // --- CRITICAL LOGIC: Increase stock when order is 'RECEIVED' ---
            if ($validated['status'] === 'RECEIVED' && $purchaseOrder->status !== 'RECEIVED') {
                DB::transaction(function () use ($purchaseOrder) {
                    foreach ($purchaseOrder->items as $item) {
                        // Increase product stock
                        $product = Product::where('company_id', $purchaseOrder->company_id)
                                          ->find($item->product_id);
                        if (!$product) {
                            throw new \Exception("Product ID {$item->product_id} not found in company {$purchaseOrder->company_id}.");
                        }
                        $product->current_stock += $item->quantity;
                        $product->save();

                        // Create a stock movement record for traceability
                        StockMovement::create([
                            'company_id' => $purchaseOrder->company_id,
                            'product_id' => $item->product_id,
                            'user_id' => auth()->id(),
                            'type' => 'IN',
                            'quantity' => $item->quantity, // Use the quantity from the item
                            'source_type' => PurchaseOrder::class, // Corrected to source_type
                            'source_id' => $purchaseOrder->id, // Corrected to source_id
                        ]);
                    }
                    $purchaseOrder->status = 'RECEIVED';
                    $purchaseOrder->save();
                });
            } else {
                $purchaseOrder->update($validated);
            }

            return response()->json($purchaseOrder->load('items'));
        } catch (Throwable $e) {
            Log::error($e);
            return response()->json(['message' => 'An unexpected error occurred while updating the purchase order.'], 500);
        }
    }
}
