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
        Schema::table('stock_movements', function (Blueprint $table) {
            // Add location_id after product_id. Make it nullable initially if you have existing data,
            // but for a fresh seed, nullable isn't strictly necessary but good practice during dev.
            // We will add a foreign key constraint.
            $table->unsignedBigInteger('location_id')->nullable()->after('product_id');

            $table->foreign('location_id')
                  ->references('id')
                  ->on('locations')
                  ->onDelete('cascade'); // If a location is deleted, delete its movements
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            // Drop foreign key first, then the column
            $table->dropForeign(['location_id']);
            $table->dropColumn('location_id');
        });
    }
};
