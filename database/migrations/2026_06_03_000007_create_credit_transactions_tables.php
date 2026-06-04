<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('credit_transactions')) {
            Schema::create('credit_transactions', function (Blueprint $table) {
                $table->id();
                $table->string('credit_no')->unique();
                $table->string('release_reference_no')->nullable();
                $table->foreignId('inventory_item_id')->nullable()->constrained('inventory_items')->nullOnDelete();
                $table->string('beneficiary_name');
                $table->string('beneficiary_account_id')->nullable();
                $table->string('material_name');
                $table->decimal('quantity', 12, 2);
                $table->string('unit', 50);
                $table->decimal('unit_cost', 12, 2);
                $table->decimal('amount', 12, 2);
                $table->decimal('remaining_balance', 12, 2);
                $table->string('status')->default('Pending');
                $table->date('credit_date');
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('credit_deductions')) {
            Schema::create('credit_deductions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('credit_transaction_id')->constrained('credit_transactions')->cascadeOnDelete();
                $table->string('payroll_batch');
                $table->decimal('amount', 12, 2);
                $table->date('deduction_date');
                $table->string('recorded_by_name')->nullable();
                $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_deductions');
        Schema::dropIfExists('credit_transactions');
    }
};
