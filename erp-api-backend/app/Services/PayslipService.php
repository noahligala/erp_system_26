<?php

namespace App\Services;

use App\Models\Accounts\Payslip;
use App\Models\Company;
use App\Models\User;
use Carbon\Carbon;
// Removed App\Exceptions\PayrollGenerationException
use InvalidArgumentException; // <-- Use PHP's built-in exception
use Illuminate\Support\Facades\DB;


class PayslipService
{
    protected PayrollService $payrollService;

    public function __construct(PayrollService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    /**
     * Generate payslips for all active employees of a specific company for a given month.
     *
     * @param Company $company The specific company to process.
     * @param Carbon $endDate The end date of the month to generate for.
     * @return int The number of payslips generated.
     * @throws InvalidArgumentException If payslips already exist for that month.
     */
    public function generateForMonth(Company $company, Carbon $endDate): int
    {
        $endDate = $endDate->endOfMonth();
        $startDate = $endDate->copy()->startOfMonth();

        // Business Rule: Prevent generating payslips for a month that already has them FOR THIS COMPANY.
        $existingPayslips = Payslip::where('company_id', $company->id) // <-- Uses the specific company ID
            ->where('pay_period_end', $endDate->toDateString())
            ->exists();

        if ($existingPayslips) {
            // --- UPDATED: Throw built-in exception ---
            throw new InvalidArgumentException('Payslips for ' . $endDate->format('F Y') . ' have already been generated.');
        }

        // Fetch employees ONLY for the specific company provided.
        $employees = User::where('company_id', $company->id) // <-- Uses the specific company ID
            ->whereHas('employeeProfile', fn($q) => $q->where('status', 'active'))
            ->with(['employeeProfile.jobTitle.allowances', 'loans', 'advances'])
            ->get();

        if ($employees->isEmpty()) {
            return 0; // No active employees in this company.
        }

        $payslipsToInsert = [];

        foreach ($employees as $employee) {
            // Calculate payroll data for each employee of THIS company
            $payrollData = $this->payrollService->calculate($employee);

            // Prepare data for insertion, ensuring company_id matches.
            $payslipsToInsert[] = [
                'company_id' => $employee->company_id, // This will be the correct company ID
                'user_id' => $employee->id,
                'pay_period_start' => $startDate->toDateString(),
                'pay_period_end' => $endDate->toDateString(),
                'base_salary' => $payrollData['base_salary'],
                'allowances' => json_encode($payrollData['allowances']), // Matches frontend expectation
                'gross_income' => $payrollData['gross_income'],        // Matches frontend expectation
                'taxable_income' => $payrollData['taxable_income'],
                'deductions' => json_encode($payrollData['statutory_deductions']), // Matches frontend expectation
                'tax_paid' => $payrollData['tax_paid'],                // Matches frontend expectation
                'loan_repayment' => $payrollData['loan_repayment'],      // Matches frontend expectation
                'advance_repayment' => $payrollData['advance_repayment'],// Matches frontend expectation
                'net_pay' => $payrollData['net_pay'],                  // Matches frontend expectation
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Perform a single, efficient bulk insert.
        Payslip::insert($payslipsToInsert);

        // Return the count for this specific company's generated payslips.
        return count($payslipsToInsert);
    }
}

