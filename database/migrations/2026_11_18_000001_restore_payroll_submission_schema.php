<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_batches')) {
            Schema::create('payroll_batches', function (Blueprint $table): void {
                $table->id();
                $table->string('batch_no')->unique();
                $table->date('period_start');
                $table->date('period_end');
                $table->string('status')->default('Draft');
                $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('payroll_slips')) {
            return;
        }

        Schema::table('payroll_slips', function (Blueprint $table): void {
            if (! Schema::hasColumn('payroll_slips', 'batch_id')) {
                $table->foreignId('batch_id')->nullable()->constrained('payroll_batches')->nullOnDelete();
            }
            if (! Schema::hasColumn('payroll_slips', 'production_record_id')) {
                $table->unsignedBigInteger('production_record_id')->nullable();
            }
            if (! Schema::hasColumn('payroll_slips', 'special_boxes')) {
                $table->unsignedInteger('special_boxes')->default(0);
            }
            foreach (['class_a_price', 'class_b_price', 'special_price', 'material_deduction', 'previous_balance', 'labor_cost', 'other_deductions', 'gross_amount', 'credit_deduction', 'net_amount'] as $column) {
                if (! Schema::hasColumn('payroll_slips', $column)) {
                    $table->decimal($column, 12, 2)->default(0);
                }
            }
        });
    }

    public function down(): void
    {
        // Keep payroll data and its batch references when rolling back.
    }
};
