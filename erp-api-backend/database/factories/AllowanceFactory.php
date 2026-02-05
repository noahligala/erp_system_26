<?php

namespace Database\Factories;

use App\Models\Accounts\Allowance;
use Illuminate\Database\Eloquent\Factories\Factory;

class AllowanceFactory extends Factory
{
    protected $model = Allowance::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement([
                'House Allowance',
                'Transport Allowance',
                'Medical Allowance',
                'Risk Allowance',
                'Hardship Allowance',
                'Overtime Allowance',
            ]),
            'description' => $this->faker->sentence(6),
            'amount' => $this->faker->randomFloat(2, 1000, 20000),
        ];
    }
}
