<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Accounts\Advance;
use App\Models\Accounts\Loan;
use Illuminate\Support\Str;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'phone_number',
        'password',
        'company_id',
        'company_role',
        'secret_key',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'secret_key',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted()
    {
        static::creating(function ($user) {
            if (empty($user->secret_key)) {
                $user->secret_key = Str::random(32);
            }
        });
    }

    // --- RELATIONSHIPS ---
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(Loan::class);
    }

    public function advances(): HasMany
    {
        return $this->hasMany(Advance::class);
    }

    // --- ROLE HELPERS (for business logic consistency) ---

    /**
     * Check if user is an admin or owner (shortcut)
     */
    public function hasAdminRole(): bool
    {
        return $this->hasAnyRole(['OWNER', 'ADMIN']);
    }

    /**
     * Check if user is a supervisor
     */
    public function isSupervisor(): bool
    {
        $this->loadMissing('employeeProfile.jobTitle');

        return $this->hasRole('Supervisor') ||
               optional(optional($this->employeeProfile)->jobTitle)->name === 'Supervisor';
    }

    /**
     * Check if user is a normal user
     */
    public function isUser(): bool
    {
        return $this->hasRole('USER');
    }

    /**
     * Shortcut for permission checks
     */
    public function canDo(string $permission): bool
    {
        return $this->can($permission); // From Spatie
    }
}
