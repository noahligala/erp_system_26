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
            // This migration corrects the schema to match the application's requirements.

            // 1. Rename 'gross_salary' to 'base_salary'
            if (Schema::hasColumn('payslips', 'gross_salary')) {
                $table->renameColumn('gross_salary', 'base_salary');
            }

            // 2. Ensure all other required columns exist
            if (!Schema::hasColumn('payslips', 'allowances')) {
                $table->json('allowances')->nullable()->after('base_salary');
            }
            if (!Schema::hasColumn('payslips', 'gross_income')) {
                $table->decimal('gross_income', 15, 2)->after('allowances');
            }
            if (!Schema::hasColumn('payslips', 'taxable_income')) {
                $table->decimal('taxable_income', 15, 2)->after('gross_income');
            }
            if (!Schema::hasColumn('payslips', 'tax_paid')) {
                $table->decimal('tax_paid', 15, 2)->after('taxable_income');
            }
            if (!Schema::hasColumn('payslips', 'loan_repayment')) {
                $table->decimal('loan_repayment', 15, 2)->default(0)->after('deductions');
            }
            if (!Schema::hasColumn('payslips', 'advance_repayment')) {
                $table->decimal('advance_repayment', 15, 2)->default(0)->after('loan_repayment');
            }
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
                'allowances', 'gross_income', 'taxable_income',
                'tax_paid', 'loan_repayment', 'advance_repayment'
            ]);
        });
    }
};
