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
        Schema::create('sales_orders', function (Blueprint $table) {
        $table->id();
        $table->string('order_number')->unique();
        $table->foreignId('customer_id')->constrained()->onDelete('restrict');
        $table->date('order_date');
        $table->enum('status', ['DRAFT', 'CONFIRMED', 'SHIPPED', 'INVOICED', 'CANCELLED'])->default('DRAFT');
        $table->decimal('total_amount', 10, 2);
        $table->foreignId('user_id')->constrained(); // User who created the order
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
