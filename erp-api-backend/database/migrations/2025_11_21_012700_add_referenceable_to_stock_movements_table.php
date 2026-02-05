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
            // These two columns define the source (Journal Entry, Sales Order, Purchase Order, etc.)
            $table->nullableMorphs('referenceable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            // We drop the two columns created by $table->morphs()
            $table->dropMorphs('referenceable');
        });
    }
};
