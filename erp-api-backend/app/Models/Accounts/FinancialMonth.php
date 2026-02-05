<?php

namespace App\Models\Accounts;
use App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialMonth extends Model
{
    use HasFactory;

    protected $table = 'financial_months';

    protected $fillable = [
        'month',           // e.g. "January"
        'year',            // e.g. 2025
        'status',          // e.g. "open" or "closed"
        'start_date',      // start of the month period
        'end_date',        // end of the month period
        'locked_by',       // user_id of the admin who closed it
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    /**
     * Scope to get the currently open financial month.
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    /**
     * Scope to get the current month's record based on today's date.
     */
    public function scopeCurrent($query)
    {
        $today = now();
        return $query->whereDate('start_date', '<=', $today)
                     ->whereDate('end_date', '>=', $today)
                     ->first();
    }

    /**
     * Helper to check if this month is open.
     */
    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    /**
     * Relationship: user who locked/closed the month.
     */
    public function lockedBy()
    {
        return $this->belongsTo(User::class, 'locked_by');
    }
}
