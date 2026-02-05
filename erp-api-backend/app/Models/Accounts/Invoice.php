<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes; // Add if using softDeletes
use App\Models\Company;
use App\Models\CRM\Customer;

class Invoice extends Model
{
    use HasFactory, SoftDeletes; // Add SoftDeletes if used

    protected $fillable = [
        'company_id',
        'customer_id',
        'invoice_number',
        'invoice_date',
        'due_date',
        'sub_total',
        'tax_amount',
        'total_amount',
        'amount_paid',
        'status',
        'notes',
    ];

    // Cast dates to Carbon instances
    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
    ];

    protected $attributes = [
        'amount_paid' => 0.00,
        'balance_due' => 0.00,
    ];


    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerPayments()
    {
        return $this->hasMany(CustomerPayment::class, 'invoice_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class);
    }

     // Helper function to generate unique invoice number (Example)
     public static function generateInvoiceNumber(int $companyId): string
     {
        // Example: INV-YYYYMMDD-COUNT
        $prefix = 'INV-';
        $today = now()->format('Ymd');
        $count = static::where('company_id', $companyId)
                      ->whereDate('created_at', today())
                      ->count() + 1;
        return $prefix . $today . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
     }
}
