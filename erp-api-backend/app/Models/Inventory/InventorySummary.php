<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Company;
use App\Models\Inventory\Location;
use App\Models\Inventory\Product;
use Exception;

class InventorySummary extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'inventory_summaries';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_id',
        'product_id',
        'location_id',
        'quantity_on_hand',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity_on_hand' => 'float', // Allows for fractional quantities (e.g., 1.5 kg)
        'company_id' => 'integer',
        'product_id' => 'integer',
        'location_id' => 'integer',
    ];

    /**
     * The "booted" method of the model.
     * Registers model event listeners.
     */
    protected static function booted(): void
    {
        // Before creating a new summary record...
        static::creating(function (InventorySummary $summary) {
            $summary->ensureProductIsNotAService();
        });

        // Before updating an existing summary record (e.g. changing product_id)...
        static::updating(function (InventorySummary $summary) {
            $summary->ensureProductIsNotAService();
        });
    }

    /**
     * safeguard: Ensure the associated product is not regarded as a service.
     * Services should not have physical inventory counts.
     *
     * @throws Exception
     */
    protected function ensureProductIsNotAService(): void
    {
        // We need to determine the product's type.
        // If the product relationship is already loaded, use it to avoid a query.
        // Otherwise, fetch the basic product data required to check the 'is_service' flag.
        $product = $this->relationLoaded('product')
            ? $this->product
            : Product::select('id', 'is_service')->find($this->product_id);

        // If the product exists and is marked as a service, stop the operation.
        if ($product && $product->is_service) {
            throw new Exception("Operation failed: Cannot create or update inventory summary for a service product (ID: {$this->product_id}). Services do not hold stock.");
        }
    }

    /**
     * Get the company that owns the inventory summary.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the product associated with the inventory summary.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the location associated with the inventory summary.
     */
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
