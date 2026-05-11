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
        $requiredTables = [
            'companies',
            'job_titles',
            'permissions',
            'allowances',
            'roles',
        ];

        foreach ($requiredTables as $table) {
            if (!Schema::hasTable($table)) {
                $this->command?->warn("⚠️ Skipping JobTitleSeeder: missing table '{$table}'");
                return;
            }
        }

        $companies = Company::all();

        if ($companies->isEmpty()) {
            $this->command?->warn("⚠️ No companies found. Skipping JobTitleSeeder.");
            return;
        }

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

        foreach ($permissionNames as $permissionName) {
            $permissions->put(
                $permissionName,
                Permission::firstOrCreate([
                    'name' => $permissionName,
                    'guard_name' => 'web',
                ])
            );
        }

        foreach ($companies as $company) {
            $this->command?->info("🏢 Seeding job titles for company: {$company->name}");

            $allowances = Allowance::where('company_id', $company->id)
                ->get()
                ->keyBy('name');

            DB::transaction(function () use ($company, $permissions, $allowances) {
                $rolesData = [
                    'System Admin' => $permissions->keys()->toArray(),

                    'Finance Director' => [
                        'manage-allowances',
                        'manage-payroll',
                        'view-financial-reports',
                        'manage-loans-advances',
                    ],

                    'Accountant' => [
                        'view-financial-reports',
                    ],

                    'Manager' => $permissions->keys()->toArray(),

                    'Supervisor' => [
                        'create-sales',
                        'edit-sales',
                    ],

                    'Sales Representative' => [
                        'create-sales',
                    ],
                ];

                foreach ($rolesData as $jobTitleName => $permissionNames) {
                    $jobTitle = JobTitle::updateOrCreate(
                        [
                            'company_id' => $company->id,
                            'name' => $jobTitleName,
                        ],
                        []
                    );

                    $role = Role::firstOrCreate([
                        'name' => "{$company->id}_{$jobTitleName}",
                        'guard_name' => 'web',
                    ]);

                    $role->syncPermissions($permissionNames);

                    if (Schema::hasColumn('job_titles', 'role_id')) {
                        $jobTitle->forceFill([
                            'role_id' => $role->id,
                        ])->save();
                    }

                    if ($jobTitleName === 'Manager') {
                        $this->syncAllowancesSafely($jobTitle, $allowances, [
                            'House Allowance' => 20000,
                            'Travel Allowance' => 10000,
                        ]);
                    }

                    if ($jobTitleName === 'Supervisor') {
                        $this->syncAllowancesSafely($jobTitle, $allowances, [
                            'House Allowance' => 15000,
                        ]);
                    }
                }
            });
        }

        $this->command?->info("✅ JobTitleSeeder completed successfully with Spatie roles and permissions.");
    }

    protected function syncAllowancesSafely(JobTitle $jobTitle, $allowances, array $allowanceMap): void
    {
        if (!$allowances || $allowances->isEmpty()) {
            return;
        }

        $syncData = [];

        foreach ($allowanceMap as $allowanceName => $amount) {
            $allowance = $allowances->get($allowanceName);

            if (!$allowance) {
                continue;
            }

            $syncData[$allowance->id] = [
                'amount' => $amount,
            ];
        }

        if (!empty($syncData)) {
            $jobTitle->allowances()->sync($syncData);
        }
    }
}
