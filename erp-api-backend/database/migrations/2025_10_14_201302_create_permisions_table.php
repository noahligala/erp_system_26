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
        // 1. Create a table for all possible permissions
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // e.g., 'create-product', 'edit-sale'
            $table->string('description');
            $table->timestamps();
        });

        // 2. Create a pivot table to link job titles to permissions (many-to-many)
        Schema::create('job_title_permission', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_title_id')->constrained()->onDelete('cascade');
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            // Ensure a permission is only assigned to a job title once
            $table->unique(['job_title_id', 'permission_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_title_permission');
        Schema::dropIfExists('permissions');
    }
};

