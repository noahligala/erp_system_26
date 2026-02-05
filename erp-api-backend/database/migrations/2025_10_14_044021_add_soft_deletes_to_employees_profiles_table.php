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
        Schema::table('employee_profiles', function (Blueprint $table) {
            // Adds a status column to track the employee's current state
            $table->string('status')->default('active')->after('job_title_id');
            // Adds a date for when the termination was effective
            $table->date('terminated_on')->nullable()->after('hired_on');
            // Adds soft delete functionality
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn('status');
            $table->dropColumn('terminated_on');
            $table->dropSoftDeletes();
        });
    }
};
