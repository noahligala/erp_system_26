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
        // First, drop the old virtual column if it exists from the previous migration.
        if (Schema::hasColumn('payslips', 'total_deductions')) {
            Schema::table('payslips', function (Blueprint $table) {
                $table->dropColumn('total_deductions');
            });
        }

        Schema::table('payslips', function (Blueprint $table) {
            // Rename gross_salary to be more specific
            $table->renameColumn('gross_salary', 'base_salary');

            // Add new columns for the detailed payslip
            $table->json('allowances')->nullable()->after('base_salary');
            $table->decimal('gross_income', 15, 2)->after('allowances');
            $table->decimal('taxable_income', 15, 2)->after('gross_income');
            $table->decimal('tax_paid', 15, 2)->after('taxable_income');
            $table->decimal('loan_repayment', 15, 2)->default(0)->after('deductions');
            $table->decimal('advance_repayment', 15, 2)->default(0)->after('loan_repayment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->renameColumn('base_salary', 'gross_salary');
            $table->dropColumn([
                'allowances',
                'gross_income',
                'taxable_income',
                'tax_paid',
                'loan_repayment',
                'advance_repayment',
            ]);
        });
    }
};
