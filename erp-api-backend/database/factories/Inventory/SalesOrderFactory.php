<?php

namespace Database\Factories\Inventory;

use App\Models\Inventory\SalesOrder;
use App\Models\CRM\Customer;
use App\Models\User;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesOrderFactory extends Factory
{
    protected $model = SalesOrder::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_number' => 'SO-' . $this->faker->unique()->numberBetween(1000, 9999),
            'order_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'status' => $this->faker->randomElement(['CONFIRMED', 'SHIPPED', 'INVOICED']),
            'total_amount' => $this->faker->randomFloat(2, 100, 10000),
            // Foreign keys will be set via relationships or the configure() method.
        ];
    }

    /**
     * Configure the model factory.
     * This is the ideal place to set up dependent models.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (SalesOrder $salesOrder) {
            // This logic runs after a SalesOrder is made but before it's created.
            // It ensures that if a company is set, its dependencies are created correctly.

            if ($salesOrder->company_id) {
                // If company_id is present (e.g., from using ->for($company)),
                // ensure the customer and user also belong to that company.
                $company = Company::find($salesOrder->company_id);

                if (!$salesOrder->customer_id) {
                    $salesOrder->customer_id = Customer::factory()->for($company)->create()->id;
                }

                if (!$salesOrder->user_id) {
                    // Use an existing user from the company or create a new one
                    $user = User::where('company_id', $company->id)->inRandomOrder()->first()
                        ?? User::factory()->for($company)->create();
                    $salesOrder->user_id = $user->id;
                }
            }
        });
    }

    // We no longer need the custom forCompany() method.
    // We will use Laravel's built-in ->for() method in the seeder.
}
