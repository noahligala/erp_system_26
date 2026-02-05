<?php

namespace App\Services;

use App\Models\Accounts\Allowance;
use App\Models\User;

class PayrollService
{
    /**
     * Calculate all payroll components for a single employee.
     */
    public function calculate(User $employee): array
    {
        $employee->loadMissing('employeeProfile.jobTitle.allowances', 'loans', 'advances');

        $baseSalary = $employee->employeeProfile->salary;

        // 1. Calculate Allowances
        $jobTitleAllowances = $employee->employeeProfile->jobTitle->allowances->pluck('pivot.amount', 'name');
        $finalAllowances = $jobTitleAllowances;

        if ($employee->employeeProfile->has_disability) {
            $disabilityAllowance = Allowance::where('company_id', $employee->company_id)
                ->where('name', 'Disability Allowance')->first();
            if ($disabilityAllowance) {
                $finalAllowances->put('Disability Allowance', 2500.00); // Example fixed amount
            }
        }
        $totalAllowances = $finalAllowances->sum();
        $grossIncome = $baseSalary + $totalAllowances;

        // 2. Statutory Deductions
        $nssfDeduction = min($grossIncome * 0.06, 1080);
        $nhifDeduction = $this->getNhifContribution($grossIncome);
        $taxableIncome = $grossIncome - $nssfDeduction;
        $tax = $this->calculatePaye($taxableIncome);

        // 3. Other Deductions (Loans/Advances)
        $loanRepayment = 0;
        $activeLoan = $employee->loans()->where('status', 'active')->first();
        if ($activeLoan) {
            $loanRepayment = min($activeLoan->monthly_repayment, $activeLoan->remaining_balance);
        }

        $advanceRepayment = 0;
        $activeAdvance = $employee->advances()->where('is_repaid', false)->first();
        if ($activeAdvance) {
            $advanceRepayment = $activeAdvance->amount;
        }

        // 4. Final Calculations
        $totalDeductions = $nssfDeduction + $nhifDeduction + $tax + $loanRepayment + $advanceRepayment;
        $netPay = $grossIncome - $totalDeductions;

        // 💡 FIX: Return a single, flat array with all keys required by the controller.
        return [
            'base_salary' => $baseSalary,
            'allowances' => $finalAllowances->all(),
            'gross_income' => $grossIncome,
            'taxable_income' => $taxableIncome,
            'statutory_deductions' => [
                'nssf' => $nssfDeduction,
                'nhif' => $nhifDeduction,
            ],
            'tax_paid' => $tax,
            'loan_repayment' => $loanRepayment,
            'advance_repayment' => $advanceRepayment,
            'net_pay' => $netPay,
            'loan_id_to_update' => $activeLoan?->id,
            'advance_id_to_update' => $activeAdvance?->id,
        ];
    }

    private function getNhifContribution(float $gross): float
    {
        if ($gross <= 5999) return 150.00;
        if ($gross >= 100000) return 1700.00;
        return 500.00;
    }

    private function calculatePaye(float $taxableIncome): float
    {
        $annualTaxable = $taxableIncome * 12;
        $relief = 28800;
        $tax = 0.00;
        if ($annualTaxable > 388000) {
            $tax += ($annualTaxable - 388000) * 0.30;
            $annualTaxable = 388000;
        }
        if ($annualTaxable > 276000) {
            $tax += ($annualTaxable - 276000) * 0.25;
            $annualTaxable = 276000;
        }
        $tax += $annualTaxable * 0.10;
        $netTax = max(0, $tax - $relief);
        return $netTax / 12;
    }
}

