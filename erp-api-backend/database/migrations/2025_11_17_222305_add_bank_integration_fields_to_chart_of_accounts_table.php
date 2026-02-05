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
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            // Stores the 'key' for which adapter to use (e.g., 'mpesa', 'kcb', 'equity')
            $table->string('bank_provider')->nullable()->after('is_system');

            // Securely stores API keys, consumer secrets, etc. as encrypted JSON
            $table->text('bank_credentials')->nullable()->after('bank_provider');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropColumn(['bank_provider', 'bank_credentials']);
        });
    }
};
