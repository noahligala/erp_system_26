<?php

namespace Database\Factories;

use App\Models\PurchaseOrder;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = PurchaseOrder::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition(): array
    {
        return [
            // Foreign keys like company_id and user_id are set by the seeder.
            'po_number' => 'PO-' . $this->faker->unique()->numberBetween(1000, 9999),
            'supplier_id' => Supplier::factory(),
            'status' => $this->faker->randomElement(['DRAFT', 'ORDERED', 'RECEIVED']),
            'total_amount' => $this->faker->randomFloat(2, 100, 10000),
            'order_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
