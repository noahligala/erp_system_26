<?php

namespace Database\Factories;

use App\Models\PurchaseOrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderItemFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = PurchaseOrderItem::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition(): array
    {
        // Calculate quantity and unit_cost to determine the subtotal
        $quantity = $this->faker->numberBetween(1, 20);
        $unit_cost = $this->faker->randomFloat(2, 10, 300);

        return [
            // Foreign keys (purchase_order_id, product_id, company_id)
            // are set by the seeder.

            'quantity' => $quantity,
            'unit_cost' => $unit_cost,
            'subtotal' => $quantity * $unit_cost,
        ];
    }
}

