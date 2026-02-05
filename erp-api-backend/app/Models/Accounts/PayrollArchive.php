<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollArchive extends Model
{
    use HasFactory;
    protected $guarded = [];

    protected $casts = [
        'report_period_end' => 'date',
        'summary' => 'array',
        'payslip_data' => 'array',
    ];
}
