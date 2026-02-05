<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Company;
use App\Models\User;
use App\Models\Accounts\ChartOfAccount;
use App\Models\Accounts\Expense;
use Carbon\Carbon;

class ExpenseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(Company $company): void
    {
        $companyId = $company->id;
        $user = User::where('company_id', $companyId)->first();

        if (!$user) {
            $this->command->warn("No users found for company {$company->name}, skipping ExpenseSeeder.");
            return;
        }

        // Find real expense accounts from this company's Chart of Accounts
        $expenseAccounts = ChartOfAccount::where('company_id', $companyId)
            ->where('account_type', 'Expense')
            ->pluck('account_name')
            ->toArray();

        if (empty($expenseAccounts)) {
            $this->command->warn("No 'Expense' type accounts found for company {$company->name}, skipping ExpenseSeeder.");
            return;
        }

        $this->command->info("Creating sample expenses for: {$company->name}");

        $vendors = ['Total Energies', 'KPLC', 'Nairobi Water', 'OfficeMax Supplies', 'Quick-Fix Auto'];
        $statuses = ['Pending', 'Approved', 'Paid', 'Rejected'];

        for ($i = 0; $i < 15; $i++) {
            $status = $statuses[array_rand($statuses)];
            $amount = rand(2500, 40000);

            Expense::create([
                'company_id' => $companyId,
                'user_id' => $user->id,
                'journal_entry_id' => null, // Will be set by ExpenseController when "Paid"
                'vendor' => $vendors[array_rand($vendors)],
                'category' => $expenseAccounts[array_rand($expenseAccounts)],
                'amount' => $amount,
                'date' => Carbon::now()->subDays(rand(1, 60)),
                'description' => 'Seeded expense claim',
                'status' => $status,
                'approved_by' => $status !== 'Pending' ? $user->id : null,
                'approved_at' => $status !== 'Pending' ? Carbon::now() : null,
            ]);
        }

        $this->command->info("✅ Sample expenses created for {$company->name}.");
    }
}
