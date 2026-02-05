<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Applicant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'job_opening_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'source',
        'status',
        'notes',
        'resume_path',
        'resume_filename',
        'added_by',
    ];

    // Accessor for full name
    public function getNameAttribute(): string
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function jobOpening(): BelongsTo
    {
        return $this->belongsTo(JobOpening::class);
    }

    public function addedByUser(): BelongsTo // User who added
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
