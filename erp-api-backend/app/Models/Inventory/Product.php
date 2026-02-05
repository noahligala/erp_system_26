<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Company;
use App\Models\Inventory\Category;
use App\Models\Inventory\StockMovement;
use App\Models\Inventory\SalesOrderItem;
use App\Models\Inventory\ProductCostLayer;
use App\Models\Inventory\InventorySummary; // 💡 ADDED Import for the new relationship

class Product extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_id',
        'name',
        'sku',
        'description', // Added description back in, good practice to have
        'unit_price',
        'category_id', // Added category_id back in
        // ❌ REMOVED: 'current_stock' - Stock is no longer held on the main product record.
        // --- NEW COSTING FIELDS ---
        'costing_method',      // Stores 'FIFO' or 'WAC'
        'current_avg_cost',    // Stores the current Weighted Average Cost
        'is_service',          // Tracks if the item should skip stock/COGS tracking
        // --- END NEW COSTING FIELDS ---
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'unit_price' => 'decimal:2',
        // --- NEW COSTING CASTS ---
        // ❌ REMOVED: 'current_stock' => 'float',
        'current_avg_cost' => 'float',
        'is_service' => 'boolean',
        // --- END NEW COSTING CASTS ---
        'company_id' => 'integer',
        'category_id' => 'integer',
    ];

    // =========================================================================
    // RELATIONSHIPS
    // =========================================================================

    /**
     * Get the company that owns the product.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the category for the product.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * A Product has many StockMovements (The transaction log).
     */
    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * A Product can appear in many Sales Order Items.
     */
    public function salesOrderItems(): HasMany
    {
        return $this->hasMany(SalesOrderItem::class);
    }

    /**
     * Links to the FIFO cost layers for this product.
     */
    public function costLayers(): HasMany
    {
        // Used primarily by the InventoryCostingService for FIFO calculation
        return $this->hasMany(ProductCostLayer::class);
    }

    /**
     * ✅ NEW RELATIONSHIP: Link to stock quantities stored at various locations.
     * This is now the source of truth for "how much stock do I have?".
     */
    public function inventorySummaries(): HasMany
    {
        return $this->hasMany(InventorySummary::class);
    }

    // =========================================================================
    // ACCESSORS & HELPERS
    // =========================================================================

    /**
     * ✅ NEW ACCESSOR: Get the total stock quantity across all locations.
     * Access this attribute via `$product->total_stock`.
     *
     * @return float
     */
    public function getTotalStockAttribute(): float
    {
        // 1. Services by definition have zero physical stock.
        if ($this->is_service) {
            return 0.0;
        }

        // 2. Sum the 'quantity_on_hand' column from the related inventorySummaries records.
        // This performs an efficient aggregate SQL query.
        return (float) $this->inventorySummaries()->sum('quantity_on_hand');
    }

    /**
     * ✅ NEW HELPER: Get the stock quantity for this product at a specific location.
     *
     * @param int $locationId The ID of the location to check.
     * @return float The stock level at that location, or 0.0 if none exists.
     */
    public function stockAtLocation(int $locationId): float
    {
        if ($this->is_service) {
            return 0.0;
        }

        // Find the summary record for this specific location.
        $summary = $this->inventorySummaries()
                        ->where('location_id', $locationId)
                        ->first();

        // Return the quantity if found, otherwise 0.0.
        return $summary ? $summary->quantity_on_hand : 0.0;
    }
}
