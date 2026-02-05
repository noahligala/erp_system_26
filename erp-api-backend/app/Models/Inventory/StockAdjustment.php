<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\JournalEntry;

class StockAdjustment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'product_id',
        'adjustment_date',
        'quantity_change', // Positive for increase (gain), Negative for decrease (loss)
        'unit_cost',       // Cost used for the adjustment value
        'reason',          // E.g., 'Physical Count', 'Spoilage', 'Theft'
        'adjustment_value', // Calculated total value of the change (Quantity * Unit Cost)
        'adjustment_account_id', // The GL account for the corresponding gain/loss (e.g., Inventory Shrinkage Expense)
        'journal_entry_id',
        'created_by',
    ];

    protected $casts = [
        'adjustment_date' => 'date',
        'quantity_change' => 'float',
        'unit_cost' => 'float',
        'adjustment_value' => 'float',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function adjustmentAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'adjustment_account_id');
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}
