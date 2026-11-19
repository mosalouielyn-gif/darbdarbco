<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_slips') || Schema::hasTable('payroll_slip_production_sources')) {
            return;
        }

        Schema::create('payroll_slip_production_sources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payroll_slip_id')->constrained('payroll_slips')->cascadeOnDelete();
            $table->string('source_table', 64);
            $table->unsignedBigInteger('source_record_id');
            $table->timestamps();
            $table->unique(['payroll_slip_id', 'source_table', 'source_record_id'], 'payroll_slip_source_unique');
            $table->index(['source_table', 'source_record_id'], 'payroll_source_lookup_index');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('payroll_slip_production_sources')) {
            Schema::drop('payroll_slip_production_sources');
        }
    }
};
