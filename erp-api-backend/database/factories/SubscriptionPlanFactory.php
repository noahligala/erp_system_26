<?php

namespace Database\Factories;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

class SubscriptionPlanFactory extends Factory
{
    /**
     * The name of the corresponding model.
     *
     * @var string
     */
    protected $model = SubscriptionPlan::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // We will default to the 'free' plan slug, but usually this factory
        // should only be called if data is already seeded or if explicitly
        // creating placeholder data.
        return [
            'name' => $this->faker->unique()->randomElement(['Tier A', 'Tier B', 'Tier C']),
            'slug' => $this->faker->unique()->slug(),
            'price' => $this->faker->randomFloat(2, 0, 100),
            'max_users' => $this->faker->numberBetween(1, 100),
            'storage_gb' => $this->faker->numberBetween(1, 1000),
            'inventory_enabled' => $this->faker->boolean(),
            'accounting_enabled' => $this->faker->boolean(),
        ];
    }
}
