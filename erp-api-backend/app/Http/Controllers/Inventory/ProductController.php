<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Inventory\Product;
use App\Models\Inventory\StockAdjustment;
use App\Services\JournalEntryService;
use App\Services\InventoryCostingService;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class ProductController extends Controller
{
    use AuthorizesRequests;

    // NOTE: Inject InventoryCostingService if you plan to use it for initial cost calculation on product creation.
    // Assuming injection of services happens via constructor (omitted here for brevity).

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        Gate::authorize('view-products');

        // Removed unnecessary Log::debug calls for cleaner production code flow

        $query = Product::where('company_id', auth()->user()->company_id)
            ->with('category');

        // Handle pagination query param
        if (request()->query('paginate') === 'false') {
             $products = $query->get();
        } else {
             $products = $query->paginate(request()->get('per_page', 20));
        }

        return response()->json($products);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Product::class);

        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->where('company_id', $companyId)],
            'description' => 'nullable|string',
            'unit_price' => 'required|numeric|min:0',
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')->where('company_id', $companyId)],
            // 💡 NEW FIELDS REQUIRED FOR COSTING
            'initial_stock' => 'nullable|integer|min:0', // Optional initial stock
            'initial_cost' => 'nullable|numeric|min:0', // Initial unit cost (Costing baseline)
            'costing_method' => ['required', Rule::in(['FIFO', 'WAC'])],
            'is_service' => 'boolean',
        ]);

        $initialCost = (float)($validated['initial_cost'] ?? 0);
        $initialStock = (int)($validated['initial_stock'] ?? 0);

        $product = Product::create([
            'company_id' => $companyId,
            'name' => $validated['name'],
            'sku' => $validated['sku'],
            'description' => $validated['description'] ?? null,
            'unit_price' => $validated['unit_price'],
            'category_id' => $validated['category_id'],
            'is_service' => $validated['is_service'] ?? false,

            // 💡 CRITICAL FIX: Set initial costing fields explicitly
            'current_stock' => $initialStock,
            'costing_method' => $validated['costing_method'],
            'current_avg_cost' => $initialCost, // Sets the baseline for WAC/FIFO valuation
        ]);

        return response()->json($product->load('category'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        $this->authorize('view', $product);

        return response()->json($product->load('category'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $this->authorize('update', $product);

        $companyId = auth()->user()->company_id;
        // ... validation ...
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'sku' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('products')->where('company_id', $companyId)->ignore($product->id)],
            'description' => 'nullable|string',
            'unit_price' => 'sometimes|required|numeric|min:0',
            'category_id' => ['sometimes', 'required', 'integer', Rule::exists('categories', 'id')->where('company_id', $companyId)],
            // Allow update of costing method if stock is zero (or very low)
            'costing_method' => ['sometimes', 'required', Rule::in(['FIFO', 'WAC'])],
            'is_service' => 'sometimes|boolean',
        ]);

        $product->update($validated);

        return response()->json($product->load('category'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $this->authorize('delete', $product);

        $product->delete(); // Assumes soft delete

        return response()->noContent();
    }
}
