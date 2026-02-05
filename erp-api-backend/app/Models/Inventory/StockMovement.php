<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Company;
use App\Models\User;
use App\Models\Inventory\Product;

class StockMovement extends Model
{
    use HasFactory;

    // 💡 FIX: Define mass assignment protected fields
    protected $fillable = [
        'company_id',
        'product_id',
        'user_id',
        'type',
        'quantity',
        'reason',
        'source_id',
        'source_type',
        'location_id',
    ];

    // 💡 FIX: Define the missing 'user()' relationship (Called by forUser() factory)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    // You will add the morphTo relationship here when needed:
    // public function source()
    // {
    //     return $this->morphTo();
    // }
}
