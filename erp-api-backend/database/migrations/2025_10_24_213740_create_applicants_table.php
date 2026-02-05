<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applicants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('job_opening_id')->constrained()->onDelete('cascade');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('source')->nullable(); // e.g., Email, Referral, Website
            $table->enum('status', [
                'new', 'screening', 'interviewing', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'withdrawn'
            ])->default('new');
            $table->text('notes')->nullable(); // For recruiter comments
            $table->string('resume_path')->nullable(); // Path to the stored resume file
            $table->string('resume_filename')->nullable(); // Original filename for download
            $table->foreignId('added_by')->nullable()->constrained('users')->onDelete('set null'); // Who added the applicant
            $table->timestamps();
            $table->softDeletes();

            // Index for faster lookup
            $table->index(['company_id', 'job_opening_id']);
            $table->unique(['company_id', 'job_opening_id', 'email']); // Prevent duplicate applications for the same job
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applicants');
    }
};
