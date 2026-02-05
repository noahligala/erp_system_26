<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\User;
use App\Models\Accounts\Loan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class LoanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @param  \App\Models\Company  $company
     */
    public function run(Company $company): void
    {
        $users = User::where('company_id', $company->id)->get();

        if ($users->isEmpty()) {
            echo "⚠️  No users found for company {$company->name}, skipping LoanSeeder.\n";
            return;
        }

        echo "💰  Creating sample loans for company: {$company->name}\n";

        $loanTypes = [
            'Emergency Loan',
            'Education Loan',
            'Car Loan',
            'Development Loan',
            'Medical Loan',
            'Salary Advance Loan',
        ];

        foreach ($users as $user) {
            // Randomly assign some users a loan
            if (rand(0, 100) < 40) { // 40% of employees get a loan
                $loanType = $loanTypes[array_rand($loanTypes)];
                $principal = rand(5000, 200000);
                $termMonths = rand(6, 24);
                $monthlyRepayment = round($principal / $termMonths, 2);
                $paidMonths = rand(0, $termMonths - 1);
                $remainingBalance = round(max($principal - ($monthlyRepayment * $paidMonths), 0), 2);

                Loan::create([
                'company_id' => $company->id, // ✅ FIX ADDED HERE
                'user_id' => $user->id,
                'issue_date' => Carbon::now()->subMonths(rand(1, 12)),
                'principal_amount' => $principal,
                'monthly_repayment' => $monthlyRepayment,
                'remaining_balance' => $remainingBalance,
                'status' => $remainingBalance <= 0 ? 'Completed' : 'Active',
                'purpose' => "{$loanType} for {$user->name}",
            ]);

            }
        }

        echo "✅  LoanSeeder completed for {$company->name}.\n";
    }
}
