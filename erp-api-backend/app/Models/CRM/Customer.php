<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes; // 💡 NEW: Import SoftDeletes trait
use App\Models\Company;
use App\Models\Inventory\SalesOrder;

class Customer extends Model
{
    use HasFactory, SoftDeletes; // 💡 NEW: Use the SoftDeletes trait

    protected $guarded = [];

    /**
     * Get the company that the customer belongs to.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function salesOrders()
    {
        // Adjust App\Models\Sales\SalesOrder::class if your path is different
        return $this->hasMany(SalesOrder::class);
    }

    /**
     * You probably also have an invoices relationship
     */
    public function invoices()
    {
        return $this->hasMany(\App\Models\Accounts\Invoice::class);
    }
}

