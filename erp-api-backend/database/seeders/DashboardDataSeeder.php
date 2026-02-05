<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\CRM\Customer;
use App\Models\Inventory\Product;
use App\Models\Inventory\SalesOrder;
use App\Models\Inventory\SalesOrderItem;
use App\Models\Inventory\Location;
use Illuminate\Database\Seeder;

class DashboardDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder creates dynamic, time-sensitive data for dashboard testing.
     */
    public function run(Company $company): void
    {
        if (!$company) {
            $this->command->warn("No company provided. Skipping DashboardDataSeeder.");
            return;
        }

        $customers = Customer::where('company_id', $company->id)->get();
        $products = Product::where('company_id', $company->id)->get();
        $users = $company->users;
        // 💡 Get company locations
        $locations = Location::where('company_id', $company->id)->get();

        if ($customers->isEmpty() || $products->isEmpty() || $users->isEmpty() || $locations->isEmpty()) {
            $this->command->warn("Skipping DashboardDataSeeder for company {$company->id}: Missing base data (customers, products, users, or locations).");
            return;
        }

        // 1. Create some recent customers
        Customer::factory(3)->for($company)->create([
            'created_at' => now()->subDays(rand(1, 15)),
        ]);

        // 2. Create some recent Sales Orders with Line Items and Locations
        for ($i = 0; $i < 5; $i++) {
            SalesOrder::factory()->for($company)
                ->has(
                    SalesOrderItem::factory()->count(rand(1, 4))
                        ->state(function () use ($company, $products, $locations) {
                            $product = $products->random();
                            // If it's a good, pick a random location. If service, location can be null.
                            $locationId = $product->is_service ? null : $locations->random()->id;
                            return [
                                'product_id' => $product->id,
                                'company_id' => $company->id,
                                'location_id' => $locationId, // 💡 Set Location for line item
                                'unit_price' => $product->unit_price,
                            ];
                        }),
                    'items'
                )
                ->create([
                    'customer_id' => $customers->random()->id,
                    'user_id' => $users->random()->id,
                    'order_date' => now()->subDays(rand(1, 20)),
                ]);
        }
    }
}
