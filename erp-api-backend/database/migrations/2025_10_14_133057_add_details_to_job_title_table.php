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
        Schema::table('job_titles', function (Blueprint $table) {
            // Adding columns after the 'description' column for organization
            $table->text('responsibilities')->nullable()->after('description');
            $table->decimal('salary_min', 10, 2)->nullable()->after('responsibilities');
            $table->decimal('salary_max', 10, 2)->nullable()->after('salary_min');
            $table->text('benefits')->nullable()->after('salary_max');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_titles', function (Blueprint $table) {
            $table->dropColumn(['responsibilities', 'salary_min', 'salary_max', 'benefits']);
        });
    }
};
