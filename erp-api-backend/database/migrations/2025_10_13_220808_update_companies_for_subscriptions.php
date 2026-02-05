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
        Schema::table('companies', function (Blueprint $table) {
            // 1. Drop the old enum column
            $table->dropColumn('subscription_plan');

            // 2. Add the foreign key reference
            $table->foreignId('subscription_plan_id')->nullable()->constrained()->onDelete('restrict')->after('domain');

            // Add columns to track billing status
            $table->dateTime('trial_ends_at')->nullable();
            $table->dateTime('subscribed_until')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
       Schema::table('companies', function (Blueprint $table) {
            $table->dropForeign(['subscription_plan_id']);
            $table->dropColumn(['subscription_plan_id', 'trial_ends_at', 'subscribed_until']);
            // Restore the old column for rollback (optional, but good practice)
            $table->enum('subscription_plan', ['FREE', 'BASIC', 'PRO'])->default('FREE');
        });
    }
};
