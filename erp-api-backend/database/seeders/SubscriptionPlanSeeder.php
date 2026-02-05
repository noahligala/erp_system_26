<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder defines the available subscription tiers.
     */
    public function run(): void
    {
        // Using updateOrCreate to prevent duplicates on re-seeding.
        // This ensures the 'free', 'basic', and 'pro' plans are always available.
        SubscriptionPlan::updateOrCreate(
            ['slug' => 'free'],
            [
                'name' => 'Free Plan',
                'price' => 0.00,
                'billing_period' => 'annually', // Free plans are effectively indefinite
                'max_users' => 5,
                'storage_gb' => 1,
                'inventory_enabled' => false,
                'accounting_enabled' => false,
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'basic'],
            [
                'name' => 'Basic Plan',
                'price' => 29.99,
                'billing_period' => 'monthly',
                'max_users' => 20,
                'storage_gb' => 10,
                'inventory_enabled' => true,
                'accounting_enabled' => false,
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'pro'],
            [
                'name' => 'Pro Plan',
                'price' => 79.99,
                'billing_period' => 'monthly',
                'max_users' => 100,
                'storage_gb' => 50,
                'inventory_enabled' => true,
                'accounting_enabled' => true,
            ]
        );
    }
}
