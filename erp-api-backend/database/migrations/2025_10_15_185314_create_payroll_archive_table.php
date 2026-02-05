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
        Schema::create('payroll_archives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->date('report_period_end');
            $table->json('summary'); // To store total gross, deductions, net pay, etc.
            $table->longText('payslip_data'); // To store a JSON blob of all individual payslips
            $table->foreignId('journal_entry_id')->nullable()->constrained();
            $table->timestamps();

            $table->unique(['company_id', 'report_period_end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_archives');
    }
};
