<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ArchivedReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'report_type', // e.g., 'Profit & Loss', 'Balance Sheet'
        'start_date',
        'end_date',
        'report_data', // The JSON structure of the report
        'created_by',
        'status', // e.g., 'Archived'
    ];

    protected $casts = [
        'report_data' => 'array', // Automatically cast the report data as a JSON array
        'start_date' => 'date',
        'end_date' => 'date',
    ];
}
