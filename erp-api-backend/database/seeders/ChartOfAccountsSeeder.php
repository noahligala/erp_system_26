<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Accounts\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $accounts = [
            // Assets (1000-1999)
            // 💡 --- FIX: Changed code from 1010 to 1020 to avoid conflict with 'Bank Account' ---
            ['account_code' => '1030', 'account_name' => 'Cash', 'account_type' => 'Asset'],
            ['account_code' => '1200', 'account_name' => 'Accounts Receivable', 'account_type' => 'Asset'],
            ['account_code' => '1400', 'account_name' => 'Inventory', 'account_type' => 'Asset'],
            ['account_code' => '1500', 'account_name' => 'Fixed Assets', 'account_type' => 'Asset'],
            // Liabilities (2000-2999)
            ['account_code' => '2010', 'account_name' => 'Accounts Payable', 'account_type' => 'Liability'],
            ['account_code' => '2200', 'account_name' => 'Salaries Payable', 'account_type' => 'Liability'],
            ['account_code' => '2300', 'account_name' => 'Tax Payable', 'account_type' => 'Liability'],
            // Equity (3000-3999)
            ['account_code' => '3010', 'account_name' => 'Owner\'s Equity', 'account_type' => 'Equity'],
            ['account_code' => '3200', 'account_name' => 'Retained Earnings', 'account_type' => 'Equity'],
            // Revenue (4000-4999)
            ['account_code' => '4000', 'account_name' => 'Sales Revenue', 'account_type' => 'Revenue'],
            ['account_code' => '4500', 'account_name' => 'Service Revenue', 'account_type' => 'Revenue'],
            // Expenses (5000-5999)
            ['account_code' => '5010', 'account_name' => 'Cost of Goods Sold', 'account_type' => 'Expense'],
            ['account_code' => '5100', 'account_name' => 'Salaries Expense', 'account_type' => 'Expense'],
            ['account_code' => '5200', 'account_name' => 'Rent Expense', 'account_type' => 'Expense'],
        ];

        // This seeder runs for all companies by default, which is fine.
        $companies = Company::all();
            $createdCount = 0;
            $conflictCount = 0;
            $existingCount = 0;

            foreach ($companies as $company) {
                foreach ($accounts as $account) {

                    // Step 1: Check if an account with this NAME already exists.
                    $existingByName = ChartOfAccount::where('company_id', $company->id)
                                                    ->where('account_name', $account['account_name'])
                                                    ->first();

                    if ($existingByName) {
                        // Account already exists by name. Our job is done. Skip.
                        $existingCount++;
                        continue;
                    }

                    // Step 2: Account doesn't exist by name. Check if the CODE is free.
                    $existingByCode = ChartOfAccount::where('company_id', $company->id)
                                                    ->where('account_code', $account['account_code'])
                                                    ->first();

                    if ($existingByCode) {
                        // The code is taken by another account. We must not create it.
                        $this->command->warn("SKIPPING: Account code {$account['account_code']} is already used by '{$existingByCode->account_name}' (Company {$company->id}). Cannot create '{$account['account_name']}'.");
                        $conflictCount++;
                        continue;
                    }

                    // Step 3: Name is new AND Code is free. It's safe to create.
                    ChartOfAccount::create([
                        'company_id' => $company->id,
                        'account_name' => $account['account_name'],
                        'account_code' => $account['account_code'],
                        'account_type' => $account['account_type'],
                    ]);
                    $createdCount++;
                }
            }

            // --- Report Results ---
            if ($createdCount > 0) {
                $this->command->info("Successfully created {$createdCount} new accounts.");
            }
            if ($conflictCount > 0) {
                $this->command->error("Could not create {$conflictCount} accounts due to code conflicts. Please review warnings.");
            }
            if ($createdCount == 0 && $conflictCount == 0 && $existingCount > 0) {
                $this->command->info('All accounts from the seeder already exist.');
            } elseif ($existingCount > 0) {
                $this->command->info("Skipped {$existingCount} accounts that already exist.");
            }
        }
    }
