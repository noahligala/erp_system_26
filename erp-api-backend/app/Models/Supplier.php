<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // 1. Added SoftDeletes
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
// 2. Import the new AP models
use App\Models\Accounts\SupplierBill;
use App\Models\Accounts\BillPayment;

class Supplier extends Model
{
    use HasFactory, SoftDeletes; // 1. Enable SoftDeletes

    protected $guarded = [];

    /**
     * Get the company that the supplier belongs to.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the purchase orders associated with this supplier.
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    /**
     * 3. Get Bills received from this supplier (Accounts Payable).
     */
    public function bills(): HasMany
    {
        return $this->hasMany(SupplierBill::class);
    }

    /**
     * 4. Get Payments made to this supplier.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(BillPayment::class);
    }

    /**
     * 5. Helper to get the current balance (Total Billed - Total Paid).
     */
    public function getBalanceAttribute()
    {
        // Sum of balance_due on all bills that are not Drafts
        return $this->bills()
            ->where('status', '!=', 'Draft')
            ->sum('balance_due');
    }
}
