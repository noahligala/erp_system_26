<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use App\Models\Inventory\SalesOrder;
use App\Models\Inventory\SalesOrderItem;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SalesController extends Controller
{
    use AuthorizesRequests;

    public function index()
    {
        $this->authorize('viewAny', SalesOrder::class);
        $salesOrders = SalesOrder::where('company_id', auth()->user()->company_id)->with('items.product')->get();
        return response()->json($salesOrders);
    }

    public function store(Request $request)
    {
        $this->authorize('create', SalesOrder::class);
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'customer_id' => ['required', 'integer', Rule::exists('customers', 'id')->where('company_id', $companyId)],
            'order_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('company_id', $companyId)],
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            $salesOrder = DB::transaction(function () use ($validated, $companyId) {
                $totalAmount = 0;

                // First, validate stock and calculate total
                foreach ($validated['items'] as $itemData) {
                    $product = Product::find($itemData['product_id']);
                    if ($product->stock < $itemData['quantity']) {
                        throw ValidationException::withMessages([
                            'items' => "Not enough stock for product: {$product->name}. Available: {$product->stock}.",
                        ]);
                    }
                    $totalAmount += $product->unit_price * $itemData['quantity'];
                }

                // Create the sales order header
                $order = SalesOrder::create([
                    'company_id' => $companyId,
                    'user_id' => auth()->id(),
                    'customer_id' => $validated['customer_id'],
                    'order_date' => $validated['order_date'],
                    'status' => 'CONFIRMED',
                    'total_amount' => $totalAmount,
                ]);

                // Create order items and decrement stock
                foreach ($validated['items'] as $itemData) {
                    $product = Product::find($itemData['product_id']);
                    $subtotal = $product->unit_price * $itemData['quantity'];

                    SalesOrderItem::create([
                        'sales_order_id' => $order->id,
                        'product_id' => $product->id,
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $product->unit_price,
                        'subtotal' => $subtotal,
                        'company_id' => $companyId,
                    ]);

                    // Decrement product stock
                    $product->decrement('stock', $itemData['quantity']);
                }

                return $order;
            });

            return response()->json($salesOrder->load('items.product'), 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'An error occurred while creating the sales order.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(SalesOrder $salesOrder)
    {
        $this->authorize('view', $salesOrder);
        return response()->json($salesOrder->load('items.product'));
    }

    public function update(Request $request, SalesOrder $salesOrder)
    {
        $this->authorize('update', $salesOrder);
        // Logic for updating a sale (e.g., changing status, adding items) would go here.
        // For now, we'll return a placeholder.
        return response()->json(['message' => 'Sales order update functionality not yet implemented.']);
    }
}

