<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\LeaveType;
use App\Models\Company; // 💡 1. Make sure Company is imported

class LeaveTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    // 💡 2. Add (Company $company) to the method signature
    public function run(Company $company): void
    {
        // 💡 3. REMOVE this line:
        // $company = $this->command->getLaravel()->make('company');

        if (!$company) {
            $this->command->warn("Company not found. Skipping LeaveTypeSeeder.");
            return;
        }

        $companyId = $company->id;

        $leaveTypes = [
            // ... (rest of the file is correct)
            [
                'company_id' => $companyId,
                'name' => 'Annual Leave',
                'description' => 'Standard paid time off accrued by employees.',
                'default_days' => 21,
                'requires_approval' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'company_id' => $companyId,
                'name' => 'Sick Leave',
                'description' => 'Time off for illness or injury.',
                'default_days' => 10,
                'requires_approval' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'company_id' => $companyId,
                'name' => 'Maternity Leave',
                'description' => 'Leave for expectant and new mothers.',
                'default_days' => 90,
                'requires_approval' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'company_id' => $companyId,
                'name' => 'Paternity Leave',
                'description' => 'Leave for new fathers.',
                'default_days' => 14,
                'requires_approval' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'company_id' => $companyId,
                'name' => 'Compassionate Leave',
                'description' => 'Leave for bereavement or caring for sick family members.',
                'default_days' => 3,
                'requires_approval' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
             [
                'company_id' => $companyId,
                'name' => 'Unpaid Leave',
                'description' => 'Approved time off without pay.',
                'default_days' => null,
                'requires_approval' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Insert the data, checking for duplicates by name within the company
        foreach ($leaveTypes as $type) {
            LeaveType::updateOrCreate(
                [
                    'company_id' => $type['company_id'],
                    'name' => $type['name']
                ], // Attributes to find existing record
                $type // Attributes to update or create with
            );
        }

        $this->command->info('Leave types seeded successfully for company ID ' . $companyId);
    }
}
