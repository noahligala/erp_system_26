<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
// Add missing imports
use App\Models\Company;
use App\Models\User;
use App\Models\Department;
use App\Models\JobTitle;

class EmployeeProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        // 💡 FIX: Changed 'hire_on' to 'hired_on'
        'hired_on' => 'date',
        'salary' => 'decimal:2',
    ];

    // Default status for new records
    protected $attributes = [
        'status' => 'active',
    ];

    /**
     * Get the company that this employee profile belongs to.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the user record associated with this employee profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the department this employee belongs to.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the Job Title for the employee profile.
     */
    public function jobTitle(): BelongsTo
    {
        return $this->belongsTo(JobTitle::class);
    }
}
