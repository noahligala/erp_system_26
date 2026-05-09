<?php

namespace App\Models\Accounts;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'user_id',
        'financial_month_id',
        'journal_entry_id',

        'pay_period_start',
        'pay_period_end',

        'base_salary',
        'gross_income',
        'gross_salary',
        'taxable_income',
        'tax_paid',

        'allowances',
        'deductions',
        'breakdown',

        'loan_repayment',
        'advance_repayment',
        'net_pay',

        'status',
    ];

    protected $casts = [
        'pay_period_start' => 'date',
        'pay_period_end' => 'date',

        'allowances' => 'array',
        'deductions' => 'array',
        'breakdown' => 'array',

        'base_salary' => 'decimal:2',
        'gross_income' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'taxable_income' => 'decimal:2',
        'tax_paid' => 'decimal:2',
        'loan_repayment' => 'decimal:2',
        'advance_repayment' => 'decimal:2',
        'net_pay' => 'decimal:2',
    ];

    protected $attributes = [
        'status' => 'generated',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function financialMonth(): BelongsTo
    {
        return $this->belongsTo(FinancialMonth::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function isPosted(): bool
    {
        return !empty($this->journal_entry_id);
    }

    public function isGenerated(): bool
    {
        return $this->status === 'generated';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function getTotalDeductionsAttribute(): float
    {
        $deductions = is_array($this->deductions) ? $this->deductions : [];

        $statutory = collect($deductions)->sum(fn ($value) => (float) $value);

        return round(
            $statutory
                + (float) $this->tax_paid
                + (float) $this->loan_repayment
                + (float) $this->advance_repayment,
            2
        );
    }

    public function getTotalAllowancesAttribute(): float
    {
        $allowances = is_array($this->allowances) ? $this->allowances : [];

        return round(
            collect($allowances)->sum(fn ($value) => (float) $value),
            2
        );
    }
}
