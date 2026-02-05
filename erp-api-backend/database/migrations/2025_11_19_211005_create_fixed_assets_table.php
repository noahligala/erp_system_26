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
        Schema::create('fixed_assets', function (Blueprint $table) {
            $table->id();

            // Core ERP Context
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('created_by')->nullable()->constrained('users');

            // Asset Details
            $table->string('asset_name');
            $table->string('asset_code')->unique()->nullable();
            $table->date('purchase_date');

            // Financials
            $table->decimal('cost', 10, 2);
            $table->unsignedSmallInteger('useful_life_years');
            $table->decimal('salvage_value', 10, 2)->default(0.00);
            $table->string('depreciation_method')->default('Straight-Line'); // E.g., Straight-Line

            // Depreciation Tracking
            $table->decimal('accumulated_depreciation', 10, 2)->default(0.00);
            $table->decimal('book_value', 10, 2)->default(0.00);
            $table->date('last_depreciation_date')->nullable();

            // GL Account Links
            // Assuming ChartOfAccount exists. These are required by the controller logic.
            $table->foreignId('depreciation_account_id')->nullable()->constrained('chart_of_accounts')->onDelete('restrict');
            $table->foreignId('accumulated_depreciation_account_id')->nullable()->constrained('chart_of_accounts')->onDelete('restrict');

            // Status and Lifecycle
            $table->string('status')->default('In Use'); // In Use, Fully Depreciated, Disposed

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fixed_assets');
    }
};
