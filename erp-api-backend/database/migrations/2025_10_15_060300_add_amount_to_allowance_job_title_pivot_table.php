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
        // Assumes the pivot table already exists and contains allowance_id and job_title_id
        Schema::table('allowance_job_title', function (Blueprint $table) {
            // CRITICAL FIX: Add the missing 'amount' column for payroll calculation
            $table->decimal('amount', 12, 2)->default(0.00)->after('job_title_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('allowance_job_title', function (Blueprint $table) {
            $table->dropColumn('amount');
        });
    }
};
