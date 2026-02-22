<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('off_days', function (Blueprint $table) {
            $table->id();

            // Multi-tenant scope
            $table->unsignedBigInteger('company_id')->index();

            // Who is off
            $table->unsignedBigInteger('user_id')->index();

            // The off-day date
            $table->date('date')->index();

            // Optional metadata
            $table->string('employee_name')->nullable(); // optional snapshot; you can derive from user anyway
            $table->string('reason', 500)->nullable();

            // Audit
            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->unsignedBigInteger('updated_by')->nullable()->index();

            $table->timestamps();
            $table->softDeletes();

            // Prevent duplicates: same user can't have two off-days on same date in same company
            $table->unique(['company_id', 'user_id', 'date'], 'off_days_company_user_date_unique');

            // Foreign keys (optional but recommended)
            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('off_days');
    }
};
