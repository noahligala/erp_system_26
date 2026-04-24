<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_openings', function (Blueprint $table) {
            // Adding the columns requested by the careers page
            // We make them nullable so we don't break any existing job records
            $table->string('department')->nullable()->after('title');
            $table->string('location')->nullable()->after('department');
            $table->string('type')->nullable()->after('location'); // e.g., Full-time, Part-time
            $table->text('requirements')->nullable()->after('description');
            $table->text('benefits')->nullable()->after('requirements');
        });
    }

    public function down(): void
    {
        Schema::table('job_openings', function (Blueprint $table) {
            $table->dropColumn(['department', 'location', 'type', 'requirements', 'benefits']);
        });
    }
};
