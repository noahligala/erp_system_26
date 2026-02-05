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
       Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique(); // Unique identifier for the product
            $table->string('name');
            $table->text('description')->nullable();

            // Pricing and Stock
            $table->decimal('unit_price', 10, 2)->default(0.00);
            $table->integer('current_stock')->default(0); // Kept current by StockMovements

            // Relationship: Links to Categories
            $table->foreignId('category_id')->constrained()->onDelete('restrict');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
