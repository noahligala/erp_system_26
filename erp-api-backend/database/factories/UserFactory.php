<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        $firstName = $this->faker->firstName();
        $lastName = $this->faker->lastName();

        return [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'name' => "{$firstName} {$lastName}", // keep for compatibility if model uses it
            'email' => $this->faker->unique()->safeEmail(),
            'phone_number' => '07' . $this->faker->numerify('########'),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),

            'company_id' => null,
            'company_role' => $this->faker->randomElement(['OWNER', 'ADMIN', 'EMPLOYEE']),
        ];
    }

    public function platformUser(): static
    {
        return $this->state(fn (array $attributes) => [
            'company_id' => null,
            'company_role' => null,
        ]);
    }

    public function companyUser(?Company $company = null): static
    {
        return $this->state(fn (array $attributes) => [
            'company_id' => $company?->id ?? Company::factory(),
            'company_role' => $this->faker->randomElement(['OWNER', 'ADMIN', 'EMPLOYEE']),
        ]);
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
