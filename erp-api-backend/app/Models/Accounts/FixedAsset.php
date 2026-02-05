<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Accounts\ChartOfAccount; // Ensure this is imported
use App\Models\Accounts\JournalEntry;   // Ensure this is imported
use App\Models\User;                    // For created_by relationship

class FixedAsset extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'asset_name',
        'asset_code', // Optional, useful for tracking (e.g., FA-001)
        'purchase_date',
        'cost',
        'useful_life_years',
        'salvage_value',
        'depreciation_method',

        // GL Account Links
        'asset_account_id',                  // The Fixed Asset GL account (Cost)
        'depreciation_account_id',           // Expense GL Account
        'accumulated_depreciation_account_id', // Contra-Asset GL Account

        // Financial Tracking
        'accumulated_depreciation',          // Total depreciation posted to date
        'book_value',                        // Cost - Accumulated Depreciation

        // Status & Audit
        'status',                            // In Use, Fully Depreciated, Disposed
        'last_depreciation_date',            // Date of the last JE posting
        'disposal_date',                     // Date asset was disposed
        'journal_entry_id',                  // Link to Acquisition or Disposal JE
        'created_by',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'last_depreciation_date' => 'date',
        'disposal_date' => 'date',
        'cost' => 'float',
        'salvage_value' => 'float',
        'accumulated_depreciation' => 'float',
        'book_value' => 'float',
    ];

    // --- Relationships ---

    /**
     * The GL account holding the original cost of the asset (e.g., 1500 Furniture).
     */
    public function assetAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'asset_account_id');
    }

    /**
     * The expense account for monthly depreciation (Debit entry).
     */
    public function depreciationAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'depreciation_account_id');
    }

    /**
     * The contra-asset account where depreciation is accumulated (Credit entry).
     */
    public function accumulatedDepreciationAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'accumulated_depreciation_account_id');
    }

    /**
     * The primary journal entry associated with this asset (Acquisition or Disposal).
     */
    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    /**
     * Polymorphic relationship for all Journal Entries related to this asset
     * (Acquisition, Depreciation runs, Disposal).
     */
    public function journalEntries()
    {
        return $this->morphMany(JournalEntry::class, 'referenceable');
    }

    /**
     * User who created the asset record.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
