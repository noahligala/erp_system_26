<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            // Optional: Link to a PO if this bill comes from an order
            $table->foreignId('purchase_order_id')->nullable()->constrained()->nullOnDelete();

            $table->string('bill_number'); // The Supplier's Invoice Number
            $table->date('bill_date');
            $table->date('due_date');

            $table->decimal('amount', 15, 2);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->decimal('balance_due', 15, 2);

            // Draft (Entered but not posted), Posted (Active liability), Paid, Partial
            $table->enum('status', ['Draft', 'Posted', 'Partially Paid', 'Paid', 'Overdue'])->default('Draft');
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        // Create lines table for details (what did we buy?)
        Schema::create('supplier_bill_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_bill_id')->constrained()->cascadeOnDelete();
            // Product is optional (could be a service/expense bill like "Rent")
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            // If not a product, we need to know which Expense Account to Debit
            $table->foreignId('chart_of_account_id')->nullable()->constrained()->nullOnDelete();

            $table->string('description');
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_bill_lines');
        Schema::dropIfExists('supplier_bills');
    }
};
