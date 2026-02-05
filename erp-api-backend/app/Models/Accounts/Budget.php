<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'created_by',
        'chart_of_account_id',
        'period',
        'amount',
    ];

    protected $casts = [
        'period' => 'date',
        'amount' => 'float',
    ];

    // --- Relationships ---

    public function account()
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
