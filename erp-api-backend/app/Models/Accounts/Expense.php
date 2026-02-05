<?php

namespace App\Models\Accounts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'date' => 'date',
        'approved_at' => 'datetime',
    ];

    // Define relationships
    public function company() { return $this->belongsTo(\App\Models\Company::class); }
    public function user() { return $this->belongsTo(\App\Models\User::class); }
    public function journalEntry() { return $this->belongsTo(JournalEntry::class); }
    public function approver() { return $this->belongsTo(\App\Models\User::class, 'approved_by'); }
}
