<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Inventory\Product; // Import Product model

class ProductCostLayer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_id',
        'cost',
        'quantity_in',
        'quantity_out', // Used to track depletion against this layer
        'remaining_quantity',
        'purchase_date',
        'company_id', // Optional, but good for data scoping
    ];

    protected $casts = [
        'cost' => 'float',
        'quantity_in' => 'float',
        'quantity_out' => 'float',
        'remaining_quantity' => 'float',
        'purchase_date' => 'date',
    ];

    // FIFO layers are typically sorted by purchase_date (oldest first)
    protected $orderBys = ['purchase_date' => 'asc', 'id' => 'asc'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
