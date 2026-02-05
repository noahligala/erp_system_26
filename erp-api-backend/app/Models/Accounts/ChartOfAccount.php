<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Company;
use App\Models\Accounts\JournalEntryLine;
use Illuminate\Support\Facades\Log;

class ChartOfAccount extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'is_system' => 'boolean',
        'bank_credentials' => 'encrypted:json',
        // 💡 'account_subtype' is a string, so default casting is fine,
        // but adding it here as a reminder of its importance.
        'account_subtype' => 'string',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'chart_of_account_id');
    }

    /**
     * Find the account ID by its code for a specific company.
     */
    public static function getAccountIdByCode(string $accountCode, int $companyId): ?int
    {
        $account = static::where('account_code', $accountCode)
                        ->where('company_id', $companyId)
                        ->first(['id']);

        if (!$account) {
            Log::warning("ChartOfAccount: Account code '{$accountCode}' not found for company ID {$companyId}.");
        }
        return $account?->id;
    }
}
