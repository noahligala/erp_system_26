<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Current LigcoSync ERP subscription tiers:
     * - Basic: KSh 1,000/month, up to 10 employees
     * - Silver: KSh 2,500/month, up to 20 employees
     * - Platinum: KSh 3,500/month, unlimited employees represented as 999999
     */
    public function run(): void
    {
        if (!Schema::hasTable('subscription_plans')) {
            $this->command?->warn('Skipping SubscriptionPlanSeeder: subscription_plans table does not exist.');
            return;
        }

        $plans = [
            [
                'lookup' => ['slug' => 'basic'],
                'data' => [
                    'name' => 'Basic Plan',
                    'slug' => 'basic',
                    'price' => 1000.00,
                    'billing_period' => 'monthly',
                    'max_users' => 10,
                    'storage_gb' => 5,
                    'inventory_enabled' => false,
                    'accounting_enabled' => false,
                    'description' => 'Starter ERP plan for small businesses with payroll and cloud backup.',
                    'features' => [
                        'Up to 10 employees',
                        'Cloud backup',
                        'Payroll management',
                    ],
                    'is_active' => true,
                    'status' => 'active',
                    'sort_order' => 1,
                ],
            ],
            [
                'lookup' => ['slug' => 'silver'],
                'data' => [
                    'name' => 'Silver Plan',
                    'slug' => 'silver',
                    'price' => 2500.00,
                    'billing_period' => 'monthly',
                    'max_users' => 20,
                    'storage_gb' => 15,
                    'inventory_enabled' => true,
                    'accounting_enabled' => false,
                    'description' => 'Growth ERP plan with cloud backup, POS access, HRM and payroll support.',
                    'features' => [
                        'Up to 20 employees',
                        'Cloud backup',
                        'POS access',
                        'HRM access',
                        'Payroll management',
                    ],
                    'is_active' => true,
                    'status' => 'active',
                    'sort_order' => 2,
                ],
            ],
            [
                'lookup' => ['slug' => 'platinum'],
                'data' => [
                    'name' => 'Platinum Plan',
                    'slug' => 'platinum',
                    'price' => 3500.00,
                    'billing_period' => 'monthly',

                    // max_users is NOT nullable in your database.
                    // Use a very high value to represent unlimited employees.
                    'max_users' => 999999,

                    'storage_gb' => 100,
                    'inventory_enabled' => true,
                    'accounting_enabled' => true,
                    'description' => 'Full enterprise ERP plan with unlimited employees, full access and 24/7 technical support.',
                    'features' => [
                        'Unlimited employees',
                        'Full ERP access',
                        'Cloud backup',
                        'POS access',
                        'HRM access',
                        'Payroll management',
                        'Finance and accounting',
                        'Inventory management',
                        'Sales and purchasing',
                        'Recruitment and leave management',
                        'Advanced analytics',
                        '24/7 technical support',
                    ],
                    'is_active' => true,
                    'status' => 'active',
                    'sort_order' => 3,
                ],
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                $plan['lookup'],
                $this->filterExistingColumns(
                    'subscription_plans',
                    $this->normalizePlanData($plan['data'])
                )
            );
        }

        $this->disableOldPlans(['free', 'pro']);

        $this->command?->info('LigcoSync subscription plans seeded successfully.');
    }

    private function normalizePlanData(array $data): array
    {
        if (isset($data['features']) && is_array($data['features'])) {
            $data['features'] = json_encode($data['features']);
        }

        return $data;
    }

    private function filterExistingColumns(string $table, array $data): array
    {
        return collect($data)
            ->filter(fn ($value, string $column) => Schema::hasColumn($table, $column))
            ->toArray();
    }

    private function disableOldPlans(array $slugs): void
    {
        foreach ($slugs as $slug) {
            $plan = SubscriptionPlan::where('slug', $slug)->first();

            if (!$plan) {
                continue;
            }

            $updates = [];

            if (Schema::hasColumn('subscription_plans', 'is_active')) {
                $updates['is_active'] = false;
            }

            if (Schema::hasColumn('subscription_plans', 'status')) {
                $updates['status'] = 'inactive';
            }

            if (!empty($updates)) {
                $plan->update($updates);
            }
        }
    }
}
