<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sales_receipts')) {
            Schema::create('sales_receipts', function (Blueprint $table) {
                $table->id();
                $table->string('receipt_no')->unique();
                $table->foreignId('beneficiary_id')->nullable()->constrained('beneficiaries')->nullOnDelete();
                $table->string('customer_name');
                $table->decimal('total_amount', 12, 2);
                $table->decimal('cash_payment', 12, 2)->default(0);
                $table->decimal('credit_amount', 12, 2)->default(0);
                $table->decimal('remaining_balance', 12, 2)->default(0);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('transaction_at');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('sales_receipt_items')) {
            Schema::create('sales_receipt_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sales_receipt_id')->constrained('sales_receipts')->cascadeOnDelete();
                $table->foreignId('inventory_item_id')->nullable()->constrained('inventory_items')->nullOnDelete();
                $table->string('item_name');
                $table->string('category')->nullable();
                $table->decimal('quantity', 12, 2);
                $table->string('unit', 50);
                $table->decimal('unit_price', 12, 2);
                $table->decimal('total_amount', 12, 2);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('credit_transactions') && ! Schema::hasColumn('credit_transactions', 'receipt_no')) {
            Schema::table('credit_transactions', function (Blueprint $table) {
                $table->string('receipt_no')->nullable()->index();
            });
        }
        foreach (['stock_transactions', 'inventory_transactions'] as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'receipt_no')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->string('receipt_no')->nullable()->index();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('credit_transactions') && Schema::hasColumn('credit_transactions', 'receipt_no')) {
            Schema::table('credit_transactions', fn (Blueprint $table) => $table->dropColumn('receipt_no'));
        }
        foreach (['stock_transactions', 'inventory_transactions'] as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'receipt_no')) {
                Schema::table($tableName, fn (Blueprint $table) => $table->dropColumn('receipt_no'));
            }
        }
        Schema::dropIfExists('sales_receipt_items');
        Schema::dropIfExists('sales_receipts');
    }
};
