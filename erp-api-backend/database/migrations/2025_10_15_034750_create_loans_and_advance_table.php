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
        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // The employee
            $table->decimal('principal_amount', 15, 2);
            $table->decimal('monthly_repayment', 15, 2);
            $table->decimal('remaining_balance', 15, 2);
            $table->date('issue_date');
            $table->enum('status', ['active', 'paid_off'])->default('active');
            $table->timestamps();
        });

        Schema::create('advances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // The employee
            $table->decimal('amount', 15, 2);
            $table->date('issue_date');
            $table->boolean('is_repaid')->default(false);
            $table->foreignId('payslip_id')->nullable()->constrained(); // Link to the payslip it was repaid on
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advances');
        Schema::dropIfExists('loans');
    }
};
