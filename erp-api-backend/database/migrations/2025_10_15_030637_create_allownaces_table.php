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
        // Table to store different types of allowances
        Schema::create('allowances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });

        // Pivot table to link allowances to job titles (many-to-many)
        Schema::create('allowance_job_title', function (Blueprint $table) {
            $table->primary(['allowance_id', 'job_title_id']);
            $table->foreignId('allowance_id')->constrained()->onDelete('cascade');
            $table->foreignId('job_title_id')->constrained()->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('allowance_job_title');
        Schema::dropIfExists('allowances');
    }
};
