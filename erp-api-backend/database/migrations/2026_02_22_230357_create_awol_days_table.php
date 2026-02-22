<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('awol_days', function (Blueprint $table) {
            $table->id();

            // Multi-tenant scope
            $table->unsignedBigInteger('company_id')->index();

            // Who is AWOL
            $table->unsignedBigInteger('user_id')->index();

            // Date of AWOL
            $table->date('date')->index();

            // Snapshot fields (optional but useful for reporting / history)
            $table->string('employee_name')->nullable();
            $table->string('reason', 500)->nullable();

            // Audit
            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->unsignedBigInteger('updated_by')->nullable()->index();

            $table->timestamps();
            $table->softDeletes();

            // Prevent duplicates: same user cannot have two AWOL records for same date in same company
            $table->unique(['company_id', 'user_id', 'date'], 'awol_days_company_user_date_unique');

            // Foreign keys (adjust table names if yours differ)
            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('awol_days');
    }
};
