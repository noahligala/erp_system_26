<?php

namespace Database\Factories\Inventory;

use App\Models\Inventory\SalesOrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesOrderItemFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = SalesOrderItem::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition(): array
    {
        return [
            // Foreign keys like sales_order_id, product_id, and company_id
            // are set by the seeder.

            'quantity' => $this->faker->numberBetween(1, 10),
            'unit_price' => $this->faker->randomFloat(2, 5, 200),

            // 💡 FIX: Calculate the subtotal based on the generated quantity and price.
            // Using a closure here gives us access to the other attributes in the definition.
            'subtotal' => function (array $attributes) {
                return $attributes['quantity'] * $attributes['unit_price'];
            },
        ];
    }
}

