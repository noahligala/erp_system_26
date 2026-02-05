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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            // Relationships
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('restrict'); // User who performed the action

            // Transaction Details
            $table->enum('type', ['IN', 'OUT', 'ADJUSTMENT'])->index(); // IN (Receipt), OUT (Sale), etc.
            $table->integer('quantity');        // Quantity moved (always positive)
            $table->text('reason')->nullable(); // Brief description (e.g., 'Initial Stock', 'Sale #100')

            // Polymorphic Relationship: Links to the source document (SalesOrder, PurchaseOrder, etc.)
            $table->nullableMorphs('source');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
