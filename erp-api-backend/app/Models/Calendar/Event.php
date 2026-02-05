<?php

namespace App\Models\Calendar;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $fillable = [
        'company_id',
        'title',
        'description',
        'category',   // ✅ add
        'location',
        'start',
        'end',
        'all_day',
        'color',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start' => 'datetime',
        'end' => 'datetime',
        'all_day' => 'boolean',
    ];
}
