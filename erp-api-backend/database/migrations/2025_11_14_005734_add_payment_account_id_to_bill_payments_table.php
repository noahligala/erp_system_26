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
        Schema::table('bill_payments', function (Blueprint $table) {
            // Add the missing column.
            // We'll place it after 'journal_entry_id' for logical grouping.
            $table->foreignId('payment_account_id')
                  ->nullable() // Set as nullable initially
                  ->constrained('chart_of_accounts') // References the 'id' on 'chart_of_accounts'
                  ->onDelete('set null')
                  ->after('journal_entry_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bill_payments', function (Blueprint $table) {
            $table->dropForeign(['payment_account_id']);
            $table->dropColumn('payment_account_id');
        });
    }
};
