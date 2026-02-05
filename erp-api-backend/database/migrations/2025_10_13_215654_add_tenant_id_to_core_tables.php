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
        // --- Inventory and CRM ---
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
        Schema::table('customers', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });

        // --- Sales ---
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });

        // --- Purchasing ---
        // 💡 --- THIS BLOCK WAS REMOVED ---
        // Schema::table('suppliers', function (Blueprint $table) {
        //     $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        // });
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });

        // --- Accounting/Finance ---
        Schema::table('accounts', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('company_id')->constrained()->onDelete('cascade')->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverses the changes by dropping the foreign key and the column.

        // --- Inventory and CRM ---
        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });

        // --- Sales ---
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });

        // --- Purchasing ---
        // 💡 --- THIS BLOCK WAS REMOVED ---
        // Schema::table('suppliers', function (Blueprint $table) {
        //     $table->dropForeign(['company_id']);
        //     $table->dropColumn('company_id');
        // });
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });

        // --- Accounting/Finance ---
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
    }
};
