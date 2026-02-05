<?php

namespace Database\Factories\Inventory;

use App\Models\Inventory\StockMovement;
use App\Models\Company;
use App\Models\User;
use App\Models\Inventory\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockMovementFactory extends Factory
{
    protected $model = StockMovement::class;

    public function definition(): array
    {
        // 💡 FIX: Removed complex factory calls from base definition to prevent nested errors.
        // The seeder MUST now provide the 'company_id' and 'user_id' explicitly.

        return [
            'type' => $this->faker->randomElement(['IN', 'OUT', 'ADJUSTMENT']),
            'quantity' => $this->faker->numberBetween(1, 100),
            'reason' => $this->faker->sentence(),

            // Link to the required foreign keys (These will rely on the caller/seeder)
            'company_id' => Company::factory(),
            'product_id' => Product::factory(),
            'user_id' => User::factory(),
        ];
    }

    // Custom state for tenancy - required by DatabaseSeeder
    public function forCompany(Company $company): static
    {
        return $this->state(fn (array $attributes) => [
            'company_id' => $company->id,

            // Ensure Product is created for this specific Company instance
            'product_id' => Product::factory()->forCompany($company)->create()->id,
        ]);
    }

    // Custom state to link to a specific User
    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }
}
