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
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique(); // e.g., 'basic', 'pro', 'enterprise'
            $table->text('description')->nullable();
            $table->decimal('price', 8, 2)->default(0.00);
            $table->integer('max_users')->default(1);
            $table->integer('storage_gb')->default(1);
            $table->boolean('inventory_enabled')->default(false);
            $table->boolean('accounting_enabled')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
