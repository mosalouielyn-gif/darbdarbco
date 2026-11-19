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
        if (! Schema::hasTable('payroll_finance_assessment_batches')) {
            Schema::create('payroll_finance_assessment_batches', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('payroll_slip_id')->constrained('payroll_slips')->cascadeOnDelete();
                $table->integer('assessed_by')->nullable();
                $table->foreign('assessed_by')->references('id')->on('users')->nullOnDelete();
                $table->string('decision', 16);
                $table->timestamps();
                $table->index(['payroll_slip_id', 'id'], 'payroll_finance_assessment_lookup');
            });
        }

        if (! Schema::hasTable('payroll_finance_assessments')) {
            Schema::create('payroll_finance_assessments', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('assessment_batch_id')->constrained('payroll_finance_assessment_batches')->cascadeOnDelete();
                $table->string('assessment_key', 64);
                $table->string('result', 16);
                $table->timestamps();
                $table->unique(['assessment_batch_id', 'assessment_key'], 'payroll_finance_assessment_item_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_finance_assessments');
        Schema::dropIfExists('payroll_finance_assessment_batches');
    }
};
