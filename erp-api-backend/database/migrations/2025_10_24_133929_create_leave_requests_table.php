<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade'); // Link to company
            $table->string('name'); // e.g., Annual Leave, Sick Leave
            $table->text('description')->nullable();
            $table->decimal('default_days', 8, 2)->nullable(); // Optional: Default allocation
            $table->boolean('requires_approval')->default(true);
            $table->timestamps();
            $table->softDeletes(); // Optional: for soft deleting types
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_types');
    }
};
