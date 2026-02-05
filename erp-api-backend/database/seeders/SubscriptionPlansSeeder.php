<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Facades\DB; // 💡 NEW: Import DB Facade

class SubscriptionPlansSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 💡 CRITICAL FIX FOR MYSQL: Temporarily disable foreign key checks
        // This allows TRUNCATE to work even when other tables (like 'companies')
        // reference this table.
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        SubscriptionPlan::truncate();

        // 💡 Re-enable checks after TRUNCATE
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        SubscriptionPlan::create([
            'name' => 'Free Trial',
            'slug' => 'free',
            'price' => 0.00,
            'max_users' => 1,
            'storage_gb' => 0.5,
            'inventory_enabled' => true,
            'accounting_enabled' => false,
        ]);

        SubscriptionPlan::create([
            'name' => 'Basic ERP',
            'slug' => 'basic',
            'price' => 49.99,
            'max_users' => 5,
            'storage_gb' => 10,
            'inventory_enabled' => true,
            'accounting_enabled' => false,
        ]);

        SubscriptionPlan::create([
            'name' => 'Professional ERP',
            'slug' => 'pro',
            'price' => 99.99,
            'max_users' => 20,
            'storage_gb' => 100,
            'inventory_enabled' => true,
            'accounting_enabled' => true,
        ]);
    }
}
