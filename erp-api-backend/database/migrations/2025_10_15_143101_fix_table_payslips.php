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
            // It includes checks to prevent errors if the migration is run on a partially modified database.

            // 1. RENAME 'gross_salary' to 'base_salary'
            // This is the primary source of the error. We only perform this action if the old column
            // exists AND the new one does not, which prevents the 'Duplicate column' error.
            if (Schema::hasColumn('payslips', 'gross_salary') && !Schema::hasColumn('payslips', 'base_salary')) {
                $table->renameColumn('gross_salary', 'base_salary');
            }

            // 2. ENSURE ALL OTHER REQUIRED COLUMNS EXIST
            // These checks make the migration safe to run multiple times.
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
            // This logic safely reverts the changes made in the 'up' method.

            if (Schema::hasColumn('payslips', 'base_salary') && !Schema::hasColumn('payslips', 'gross_salary')) {
                $table->renameColumn('base_salary', 'gross_salary');
            }

            $columnsToDrop = [
                'allowances', 'gross_income', 'taxable_income',
                'tax_paid', 'loan_repayment', 'advance_repayment'
            ];
            foreach($columnsToDrop as $column) {
                if (Schema::hasColumn('payslips', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

