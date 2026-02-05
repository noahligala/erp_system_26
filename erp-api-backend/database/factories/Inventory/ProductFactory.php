<?php

namespace Database\Factories\Inventory;

use App\Models\Inventory\Category;
use App\Models\Inventory\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition(): array
    {
        // Decide randomly if this default product is a service
        $isService = $this->faker->boolean(20); // 20% chance of being a service

        return [
            'name' => $this->faker->catchPhrase(),
            'description' => $this->faker->paragraph(),
            'sku' => $this->faker->unique()->ean8(),
            'unit_price' => $this->faker->randomFloat(2, 10, 1000),
            // ❌ REMOVED: 'current_stock' - Stock is now handled by InventorySummary records.

            // ✅ ADDED: New costing and service fields
            'is_service' => $isService,
            // If it's a service, costing method is null. Otherwise, default to WAC.
            'costing_method' => $isService ? null : 'WAC',
            // Default average cost to 0. It will be updated when stock is added.
            'current_avg_cost' => 0,

            // These are set to null by default. The configure() method or a seeder state will handle them.
            'company_id' => null,
            'category_id' => null,
        ];
    }

    /**
     * Configure the model factory.
     *
     * @return $this
     */
    public function configure(): static
    {
        return $this->afterMaking(function (Product $product) {
            // This hook runs before the model is saved to the database.
            // If no category is specified, we create a default one.
            if (!$product->category_id) {
                // This logic relies on a company_id being set on the product before this point.
                // Your seeder does this correctly with ->for($company).
                if ($product->company_id) {
                    // 💡 FIX: The unique constraint violation suggests the database's unique key is only on the 'name' column.
                    // This is a workaround to make the default category name unique per company.
                    // The ideal solution is a composite unique key on ['company_id', 'name'] in the database migration.
                    $generalCategoryName = 'General (' . $product->company_id . ')';

                    $category = Category::firstOrCreate(
                        ['company_id' => $product->company_id, 'name' => $generalCategoryName],
                        ['description' => 'A default category for uncategorized products.']
                    );
                    $product->category_id = $category->id;
                }
            }
        });
    }
}
