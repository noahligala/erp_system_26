<?php

namespace App\Models\Accounts;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Accounts\FinancialMonth;
use App\Models\Accounts\JournalEntry;



class Payslip extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'user_id',
        'pay_period_start',
        'pay_period_end',
        'base_salary',
        'gross_income',
        'gross_salary',
        'taxable_income',
        'tax_paid',           // 💡 NEW: Added from table structure
        'allowances',         // 💡 NEW: Added from table structure
        'loan_repayment',     // 💡 NEW: Added from table structure
        'advance_repayment',  // 💡 NEW: Added from table structure
        'deductions',
        'net_pay',
        'status',
        'breakdown',
    ];

    protected $casts = [
        'pay_period_start' => 'date',
        'pay_period_end' => 'date',
        'gross_income' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'taxable_income' => 'decimal:2',
        'tax_paid' => 'decimal:2',         // 💡 NEW: Added for casting
        'loan_repayment' => 'decimal:2',   // 💡 NEW: Added for casting
        'advance_repayment' => 'decimal:2',// 💡 NEW: Added for casting
        'deductions' => 'array',
        'net_pay' => 'decimal:2',
        'allowances' => 'array',           // 💡 NEW: Added for casting
        'breakdown' => 'array',
    ];

    // Relationships
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the journal entry associated with this payslip (when payroll is posted).
     */
    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }
    public function financialMonth()
{
    return $this->belongsTo(FinancialMonth::class);
}
}
