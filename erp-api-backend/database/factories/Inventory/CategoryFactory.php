<?php

namespace Database\Factories\Inventory;

use App\Models\Inventory\Category;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            // Ensure unique category names per factory run
            'name' => $this->faker->unique()->word(),
            'description' => $this->faker->sentence(),
            'company_id' => Company::factory(),
        ];
    }

    /**
     * Associate the category with an existing company.
     */
    public function forCompany(Company $company): static
    {
        return $this->state(fn (array $attributes) => [
            'company_id' => $company->id,
        ]);
    }

    /**
     * Reset unique Faker values if needed to avoid overflow in large seeders.
     */
    public function resetUnique(): static
    {
        $this->faker->unique(true);
        return $this;
    }
}
