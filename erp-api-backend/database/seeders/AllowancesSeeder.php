<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Accounts\Allowance;
use Illuminate\Database\Seeder;

class AllowancesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder creates the standard *types* of allowances for a company.
     */
    public function run(Company $company): void
    {
        $allowances = [
            // 💡 FIX: Added a default 'amount' of 0 to satisfy the current database schema.
            // This is a workaround for a migration conflict. The 'amount' for an allowance
            // is properly defined when it's assigned to a Job Title.
            ['name' => 'House Allowance', 'amount' => 0],
            ['name' => 'Travel Allowance', 'amount' => 0],
            ['name' => 'Disability Allowance', 'amount' => 0],
            ['name' => 'Uniform Allowance', 'amount' => 0],
        ];

        foreach ($allowances as $allowance) {
            // Use firstOrCreate to avoid duplicates if the seeder is run multiple times.
            Allowance::firstOrCreate(
                ['company_id' => $company->id, 'name' => $allowance['name']],
                $allowance
            );
        }
    }
}

