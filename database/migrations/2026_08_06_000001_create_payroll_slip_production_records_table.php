<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_slip_production_records')) {
            Schema::create('payroll_slip_production_records', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payroll_slip_id')->constrained('payroll_slips')->cascadeOnDelete();
                $table->string('source_table', 64);
                $table->unsignedBigInteger('production_record_id');
                $table->date('harvest_date')->nullable();
                $table->timestamps();
                $table->unique(['payroll_slip_id', 'source_table', 'production_record_id'], 'payroll_slip_production_records_unique');
                $table->index(['source_table', 'production_record_id'], 'payroll_production_record_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_slip_production_records');
    }
};
