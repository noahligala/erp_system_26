<?php

namespace App\Models;

use App\Models\Accounts\Allowance;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Permission\Models\Role; // Spatie integration

class JobTitle extends Model
{
    use HasFactory;

    protected $guarded = [];

    /**
     * Get the company that owns the job title.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get all employees with this job title.
     */
    public function employees(): HasMany
    {
        return $this->hasMany(EmployeeProfile::class);
    }

    /**
     * Get the allowances associated with this job title.
     */
    public function allowances(): BelongsToMany
    {
        return $this->belongsToMany(Allowance::class, 'allowance_job_title')
                    ->withPivot('amount');
    }

    /**
     * Each job title corresponds to a Spatie role.
     * We map job titles directly to roles instead of custom pivot.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}
