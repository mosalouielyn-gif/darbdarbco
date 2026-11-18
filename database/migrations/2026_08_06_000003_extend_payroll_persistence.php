<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_batches')) {
            Schema::create('payroll_batches', function (Blueprint $table) {
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

        if (! Schema::hasTable('payroll_slips')) return;
        Schema::table('payroll_slips', function (Blueprint $table) {
            if (! Schema::hasColumn('payroll_slips', 'batch_id') && Schema::hasTable('payroll_batches')) $table->foreignId('batch_id')->nullable()->constrained('payroll_batches')->nullOnDelete();
            if (! Schema::hasColumn('payroll_slips', 'production_record_id')) $table->unsignedBigInteger('production_record_id')->nullable();
            if (! Schema::hasColumn('payroll_slips', 'special_boxes')) $table->unsignedInteger('special_boxes')->default(0);
            if (! Schema::hasColumn('payroll_slips', 'class_a_price')) $table->decimal('class_a_price', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'class_b_price')) $table->decimal('class_b_price', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'special_price')) $table->decimal('special_price', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'material_deduction')) $table->decimal('material_deduction', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'previous_balance')) $table->decimal('previous_balance', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'labor_cost')) $table->decimal('labor_cost', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'other_deductions')) $table->decimal('other_deductions', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'gross_amount')) $table->decimal('gross_amount', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'credit_deduction')) $table->decimal('credit_deduction', 12, 2)->default(0);
            if (! Schema::hasColumn('payroll_slips', 'net_amount')) $table->decimal('net_amount', 12, 2)->default(0);
        });
    }

    public function down(): void
    {
        // Payroll values and batches may contain live financial history; keep this migration additive.
    }
};
