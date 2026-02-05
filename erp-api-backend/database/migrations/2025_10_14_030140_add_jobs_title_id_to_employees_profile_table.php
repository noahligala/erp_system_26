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
            // Add the job_title_id after the department_id column
            $table->foreignId('job_title_id')
                  ->nullable()
                  ->after('department_id')
                  ->constrained('job_titles')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            // Drop the foreign key constraint first, then the column
            $table->dropForeign(['job_title_id']);
            $table->dropColumn('job_title_id');
        });
    }
};
