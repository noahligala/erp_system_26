<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use App\Models\Company;
// Assuming User model exists in App\Models
use App\Models\User;

class JournalEntry extends Model
{
    use HasFactory;

    // Using guarded allows the Service to fill the new columns (status, total, source, created_by)
    // without needing to update a $fillable array every time.
    protected $guarded = [];

    protected $casts = [
        'transaction_date' => 'date',
        // 💡 NEW: Ensure the total is treated as a number, not a string
        'total' => 'decimal:4',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function referenceable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * 💡 NEW: Audit trail relationship.
     * Get the user who created the entry.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Helper to check if editable
    public function isEditable(): bool
    {
        return $this->status === 'draft';
    }
}
