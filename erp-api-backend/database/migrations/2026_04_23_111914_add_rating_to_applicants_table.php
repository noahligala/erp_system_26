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
        Schema::table('applicants', function (Blueprint $table) {
            // Adds a decimal column for the rating (allows for half-stars like 4.5 if you ever need them)
            // Places it right after the 'status' column for neatness
            $table->decimal('rating', 3, 1)->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applicants', function (Blueprint $table) {
            // Removes the column if you ever roll back the migration
            $table->dropColumn('rating');
        });
    }
};
