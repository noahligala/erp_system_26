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
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();

            // Core ERP Context
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');

            // Product and GL Linkage
            $table->foreignId('product_id')->constrained('products')->onDelete('restrict');
            $table->foreignId('adjustment_account_id')->constrained('chart_of_accounts')->onDelete('restrict')->comment('The GL account for shrinkage/gain');
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->onDelete('set null');

            // Transaction Details
            $table->date('adjustment_date');
            $table->string('reason'); // e.g., Spoilage, Physical Count, Theft

            // Financial & Quantity Impact
            $table->decimal('quantity_change', 10, 2)->comment('Positive for gain, negative for loss');
            $table->decimal('unit_cost', 10, 4)->comment('The unit cost used to calculate the value');
            $table->decimal('adjustment_value', 10, 2)->comment('Absolute value of (quantity_change * unit_cost)');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
    }
};
