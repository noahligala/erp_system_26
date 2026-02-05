<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ⚠️ CRITICAL DATA MIGRATION STEP (OPTIONAL BUT RECOMMENDED) ⚠️
        // Before dropping the 'current_stock' column, you might want to migrate
        // existing stock data to the new 'inventory_summaries' table.
        // This assumes you have a 'default' location created. Let's assume Location ID 1 is default.
        // UNCOMMENT THE BLOCK BELOW TO RUN DATA MIGRATION
        /*
        $defaultLocationId = 1; // REPLACE WITH YOUR ACTUAL DEFAULT LOCATION ID
        $productsWithStock = DB::table('products')
                                ->where('is_service', false)
                                ->where('current_stock', '>', 0)
                                ->get();

        foreach ($productsWithStock as $product) {
            DB::table('inventory_summaries')->insertOrIgnore([
                'company_id' => $product->company_id,
                'product_id' => $product->id,
                'location_id' => $defaultLocationId,
                'quantity_on_hand' => $product->current_stock,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        */
        // ⚠️ END DATA MIGRATION STEP ⚠️


        Schema::table('products', function (Blueprint $table) {
            // 1. Remove the single-location stock column.
            // We use dropColumn if it exists to avoid errors if it was never run.
            if (Schema::hasColumn('products', 'current_stock')) {
                $table->dropColumn('current_stock');
            }

            // Remove 'initial_stock' if it was part of your original schema design.
            if (Schema::hasColumn('products', 'initial_stock')) {
                $table->dropColumn('initial_stock');
            }

            // 2. Ensure costing and service fields exist.
            // We check first so this migration doesn't fail if you already added them in a previous migration.
            if (!Schema::hasColumn('products', 'is_service')) {
                 $table->boolean('is_service')->default(false)->after('category_id');
            }
            if (!Schema::hasColumn('products', 'costing_method')) {
                // ENUM is often better suited than string for fixed options
                $table->enum('costing_method', ['FIFO', 'WAC'])->nullable()->after('is_service');
            }
            if (!Schema::hasColumn('products', 'current_avg_cost')) {
                // Use high precision for cost calculations
                $table->decimal('current_avg_cost', 20, 6)->default(0)->after('costing_method');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // 1. Re-add the dropped columns.
            // NOTE: Data lost in the 'up' method cannot be recovered here without a backup.
            if (!Schema::hasColumn('products', 'current_stock')) {
                 $table->decimal('current_stock', 15, 4)->default(0)->after('unit_price');
            }
             if (!Schema::hasColumn('products', 'initial_stock')) {
                 $table->decimal('initial_stock', 15, 4)->nullable()->after('current_stock');
            }

            // 2. Drop the newly added fields if you want a true reversal.
            // Comment these out if you want to keep cost/service fields even on rollback.
            if (Schema::hasColumn('products', 'current_avg_cost')) {
                $table->dropColumn('current_avg_cost');
            }
            if (Schema::hasColumn('products', 'costing_method')) {
                $table->dropColumn('costing_method');
            }
            if (Schema::hasColumn('products', 'is_service')) {
                $table->dropColumn('is_service');
            }
        });
    }
};
