<?php

namespace Database\Factories;

use App\Models\Accounts\Loan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LoanFactory extends Factory
{
    protected $model = Loan::class;

    public function definition(): array
    {
        $principal = $this->faker->numberBetween(5000, 100000);
        $monthly = round($principal / $this->faker->numberBetween(6, 24), 2);
        $remaining = $principal - ($monthly * $this->faker->numberBetween(1, 6));

        return [
            'user_id' => User::factory(),
            'issue_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'principal_amount' => $principal,
            'monthly_repayment' => $monthly,
            'remaining_balance' => max($remaining, 0),
            'status' => $this->faker->randomElement(['Active', 'Completed', 'Defaulted']),
            'purpose' => $this->faker->sentence(5),
        ];
    }
}
