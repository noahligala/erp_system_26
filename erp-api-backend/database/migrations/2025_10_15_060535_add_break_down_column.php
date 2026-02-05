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
        Schema::table('payslips', function (Blueprint $table) {
            // CRITICAL FIX: Add the 'breakdown' column to store the payroll calculation details as JSON.
            // This is required by the AccountingController after integrating PayrollService.
            $table->json('breakdown')->nullable()->after('net_pay');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn('breakdown');
        });
    }
};
