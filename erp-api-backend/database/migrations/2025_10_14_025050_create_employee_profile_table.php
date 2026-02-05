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
        // This table holds all HRM-specific data, keeping the 'users' table clean for auth.
        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->nullable()->constrained()->onDelete('set null');

            $table->decimal('salary', 10, 2)->nullable();

            // Sensitive personal identification numbers. Stored as encrypted strings.
            $table->string('bank_account_number')->nullable();
            $table->string('national_id_number')->nullable();
            $table->string('nssf_number')->nullable(); // National Social Security Fund
            $table->string('kra_pin')->nullable();     // Kenya Revenue Authority PIN
            $table->string('nhif_number')->nullable();     // National Hospital Insurance Fund

            $table->date('hired_on')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_profiles');
    }
};
