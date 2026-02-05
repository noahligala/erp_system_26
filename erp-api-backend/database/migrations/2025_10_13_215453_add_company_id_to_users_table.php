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
        Schema::table('users', function (Blueprint $table) {
            // User can be a member of one company (the tenant)
            $table->foreignId('company_id')->nullable()->constrained()->onDelete('cascade');

            // Add a field to define the user's role within the company (e.g., ADMIN, EMPLOYEE)
            $table->enum('company_role', ['OWNER', 'ADMIN', 'EMPLOYEE'])->default('EMPLOYEE');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn(['company_id', 'company_role']);
        });
    }
};
