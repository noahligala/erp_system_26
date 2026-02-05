<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // 1. Costing Method and Value Tracking
            // Changed default costing method to 'WAC' (Weighted Average Cost).
            $table->string('costing_method', 10)->default('WAC')->after('current_stock')->comment('FIFO or WAC (Weighted Average Cost)');

            // Changed precision of current_avg_cost to (15, 4) for better accuracy in financial calculations.
            $table->decimal('current_avg_cost', 15, 4)->default(0.0000)->after('costing_method')->comment('Current value used for WAC and Balance Sheet');

            // 2. Service Flag (to skip inventory tracking)
            // No changes here, this is correct.
            $table->boolean('is_service')->default(false)->after('current_avg_cost')->comment('True if the product is a service and does not require stock tracking.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['is_service', 'current_avg_cost', 'costing_method']);
        });
    }
};
