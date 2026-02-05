<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes; // 💡 NEW: Import SoftDeletes trait
use App\Models\Company;
use App\Models\Inventory\SalesOrder;
use App\Models\Inventory\Product;

class SalesOrderItem extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * We need to allow mass assignment for seeding the required IDs and data.
     */
    protected $fillable = [
        'sales_order_id',
        'product_id',
        'company_id', // Multi-Tenancy Key
        'quantity',
        'unit_price',
        'subtotal',
    ];

    /**
     * Get the Company (Tenant) that owns the sales order item.
     * 💡 FIX: Resolves the Call to undefined method SalesOrderItem::company() error.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the Sales Order header this item belongs to.
     */
    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    /**
     * Get the Product this item relates to.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
