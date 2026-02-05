<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\JobTitle;
use App\Models\Accounts\Allowance;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class JobTitleSeeder extends Seeder
{
    public function run(): void
    {
        $requiredTables = ['companies', 'job_titles', 'permissions', 'allowances', 'roles'];

        foreach ($requiredTables as $table) {
            if (!Schema::hasTable($table)) {
                $this->command->warn("⚠️ Skipping JobTitleSeeder: missing table '{$table}'");
                return;
            }
        }

        $companies = Company::all();
        if ($companies->isEmpty()) {
            $this->command->warn("⚠️ No companies found. Skipping JobTitleSeeder.");
            return;
        }

        // Define Spatie permissions
        $permissionNames = [
            'manage-allowances',
            'manage-payroll',
            'view-financial-reports',
            'manage-loans-advances',
            'manage-purchasing',
            'manage-customers',
            'create-sales',
            'manage-products',
            'edit-sales',
        ];

        $permissions = collect();
        foreach ($permissionNames as $perm) {
            $permissions->put(
                $perm,
                Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web'])
            );
        }

        foreach ($companies as $company) {
            $this->command->info("🏢 Seeding job titles for company: {$company->name}");

            $allowances = Allowance::where('company_id', $company->id)->get()->keyBy('name');

            DB::transaction(function () use ($company, $permissions, $allowances) {
                // Define job titles and their permission sets
                $rolesData = [
                    'System Admin' => $permissions->pluck('name')->toArray(),
                    'Finance Director' => [
                        'manage-allowances',
                        'manage-payroll',
                        'view-financial-reports',
                        'manage-loans-advances',
                    ],
                    'Accountant' => ['view-financial-reports'],
                    'Manager' => $permissions->pluck('name')->toArray(),
                    'Supervisor' => ['create-sales', 'edit-sales'],
                    'Sales Representative' => ['create-sales'],
                ];

                foreach ($rolesData as $jobTitleName => $permNames) {
                    // 1️⃣ Create or update JobTitle
                    $jobTitle = JobTitle::updateOrCreate(
                        ['company_id' => $company->id, 'name' => $jobTitleName]
                    );

                    // 2️⃣ Create or update Spatie Role for this job title
                    $role = Role::firstOrCreate(
                        ['name' => "{$company->id}_{$jobTitleName}", 'guard_name' => 'web']
                    );

                    // 3️⃣ Sync permissions to that role
                    $role->syncPermissions($permNames);

                    // 4️⃣ Link role to JobTitle
                    $jobTitle->update(['role_id' => $role->id]);

                    // 5️⃣ Optionally attach allowances
                    if ($jobTitleName === 'Manager' && $allowances->count()) {
                        $jobTitle->allowances()->sync([
                            optional($allowances->get('House Allowance'))->id => ['amount' => 20000],
                            optional($allowances->get('Travel Allowance'))->id => ['amount' => 10000],
                        ]);
                    }

                    if ($jobTitleName === 'Supervisor' && $allowances->count()) {
                        $jobTitle->allowances()->sync([
                            optional($allowances->get('House Allowance'))->id => ['amount' => 15000],
                        ]);
                    }
                }
            });
        }

        $this->command->info("✅ JobTitleSeeder completed successfully with Spatie roles and permissions.");
    }
}
