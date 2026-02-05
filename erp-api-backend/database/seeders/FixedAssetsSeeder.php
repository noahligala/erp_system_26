<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Accounts\FixedAsset;
use App\Models\Accounts\ChartOfAccount;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class FixedAssetsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companyId = 1; // Assuming your test environment uses company_id 1
        $userId = 1;    // Assuming test user ID is 1

        Log::info('--- Starting Fixed Assets Seeder ---');

        // --- 1. Find Required GL Accounts ---
        // We must ensure the necessary Expense and Contra-Asset accounts exist.
        // Assuming standard account codes exist or we create fallback accounts.

        $depreciationExpenseAccount = ChartOfAccount::firstOrCreate(
            ['company_id' => $companyId, 'account_code' => '6050'],
            ['account_name' => 'Depreciation Expense', 'account_type' => 'Expense']
        );

        $accumulatedDepreciationAccount = ChartOfAccount::firstOrCreate(
            ['company_id' => $companyId, 'account_code' => '1510'],
            ['account_name' => 'Accumulated Depreciation - Office', 'account_type' => 'Asset'] // Contra-Asset is usually categorized as Asset
        );

        if (!$depreciationExpenseAccount || !$accumulatedDepreciationAccount) {
            Log::error('CRITICAL: Fixed Asset Seeder failed because required GL accounts could not be created or found.');
            return;
        }

        // --- 2. Define Test Assets ---
        $assets = [
            [
                'asset_name' => 'Server Rack P100',
                'asset_code' => 'SR-P100',
                'purchase_date' => Carbon::now()->subMonths(18)->format('Y-m-d'), // 1.5 years ago
                'cost' => 120000.00,
                'useful_life_years' => 5,
                'salvage_value' => 10000.00,
                'depreciation_method' => 'Straight-Line',
                'status' => 'In Use',
                'accumulated_depreciation' => 0.00,
                'book_value' => 120000.00,
            ],
            [
                'asset_name' => 'Office Laptop (Marketing)',
                'asset_code' => 'LT-MKT-001',
                'purchase_date' => Carbon::now()->subMonths(6)->format('Y-m-d'), // 6 months ago
                'cost' => 75000.00,
                'useful_life_years' => 3,
                'salvage_value' => 5000.00,
                'depreciation_method' => 'Straight-Line',
                'status' => 'In Use',
                'accumulated_depreciation' => 0.00,
                'book_value' => 75000.00,
            ],
            [
                'asset_name' => 'Warehouse Forklift',
                'asset_code' => 'WH-FLK-001',
                'purchase_date' => Carbon::now()->subYears(10)->format('Y-m-d'), // 10 years ago (Fully depreciated)
                'cost' => 50000.00,
                'useful_life_years' => 5,
                'salvage_value' => 5000.00,
                'depreciation_method' => 'Straight-Line',
                // Set status and value to reflect full depreciation
                'status' => 'Fully Depreciated',
                'accumulated_depreciation' => 45000.00,
                'book_value' => 5000.00,
            ],
        ];

        // --- 3. Insert Records ---
        foreach ($assets as $assetData) {
            FixedAsset::create([
                ...$assetData,
                'company_id' => $companyId,
                'depreciation_account_id' => $depreciationExpenseAccount->id,
                'accumulated_depreciation_account_id' => $accumulatedDepreciationAccount->id,
                'created_by' => $userId,
            ]);
        }

        Log::info('--- Fixed Assets Seeder completed. 3 assets inserted. ---');
    }
}
