<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Services\PayslipService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

class PayslipSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @param Company $company The company to seed payslips for.
     */
    public function run(Company $company): void
    {
        try {
            // Get the service from the container
            $payslipService = app(PayslipService::class);

            // Generate payslips for the previous month
            $lastMonth = now()->subMonth()->endOfMonth();
            $payslipService->generateForMonth($company, $lastMonth);

        } catch (\Exception $e) {
            // Log an error if payslip generation fails during seeding
            Log::error("PayslipSeeder failed for company {$company->id}: " . $e->getMessage());
        }
    }
}
