<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'domain',
        'owner_user_id',
        'subscription_plan_id',
        'trial_ends_at',
        'is_active',
        'logo',
        'po_box',
        'tel_number',
        'email_address',
        'tagline',
        'website_url',
        'kra_pin',
        'nhif_number',
        'nssf_number',
        'address',
        'industry',
    ];

    // Relationships
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    // Booted model event
    protected static function booted()
    {
        static::created(function ($company) {
            try {
                // Automatically create default accounts
                app(\Database\Seeders\CompanyDefaultAccountsSeeder::class)
                    ->createDefaultsForCompany($company);

                Log::info("Default accounts created for new company: {$company->name}");
            } catch (\Throwable $e) {
                Log::error("Failed to create default accounts for company #{$company->id}", [
                    'error' => $e->getMessage(),
                ]);
            }
        });
    }
}
