<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Company; // Assuming you have a Company model
use App\Models\CRM\Customer; // Assuming you have a Customer model

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Company::class)->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Customer::class)->constrained()->restrictOnDelete(); // Prevent deleting customer with invoices
            $table->string('invoice_number')->unique(); // Unique invoice number
            $table->date('invoice_date');
            $table->date('due_date');
            $table->decimal('sub_total', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0); // Add if you need tax calculation
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->enum('status', ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Void'])->default('Draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Optional: for voiding/archiving instead of hard delete
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
