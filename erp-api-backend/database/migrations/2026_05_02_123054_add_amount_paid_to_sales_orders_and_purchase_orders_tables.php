<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sales_orders') && !Schema::hasColumn('sales_orders', 'amount_paid')) {
            Schema::table('sales_orders', function (Blueprint $table) {
                $table->decimal('amount_paid', 15, 2)
                    ->default(0)
                    ->after('total_amount');

                $table->index(['company_id', 'status']);
                $table->index('order_date');
            });
        }

        if (Schema::hasTable('purchase_orders') && !Schema::hasColumn('purchase_orders', 'amount_paid')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->decimal('amount_paid', 15, 2)
                    ->default(0)
                    ->after('total_amount');

                $table->index(['company_id', 'status']);
                $table->index('order_date');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('sales_orders') && Schema::hasColumn('sales_orders', 'amount_paid')) {
            Schema::table('sales_orders', function (Blueprint $table) {
                $table->dropColumn('amount_paid');
            });
        }

        if (Schema::hasTable('purchase_orders') && Schema::hasColumn('purchase_orders', 'amount_paid')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->dropColumn('amount_paid');
            });
        }
    }
};
