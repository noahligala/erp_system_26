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
        // 💡 UPDATED: Renamed table and changed user_id to employee_profile_id
        // Pivot table to link arbitrary allowances directly to an employee's profile
        Schema::create('allowance_employee_profile', function (Blueprint $table) {
            $table->primary(['allowance_id', 'employee_profile_id']);
            $table->foreignId('allowance_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_profile_id')->constrained('employee_profiles')->onDelete('cascade');
            $table->decimal('amount', 15, 2);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('allowance_employee_profile');
    }
};
