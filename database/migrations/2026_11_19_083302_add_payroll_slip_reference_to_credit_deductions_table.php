<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('credit_deductions') || Schema::hasColumn('credit_deductions', 'payroll_slip_id')) {
            return;
        }

        Schema::table('credit_deductions', function (Blueprint $table): void {
            $table->foreignId('payroll_slip_id')
                ->nullable()
                ->constrained('payroll_slips')
                ->restrictOnDelete();

            $table->unique(
                ['payroll_slip_id', 'credit_transaction_id'],
                'credit_deductions_payroll_slip_credit_unique',
            );
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('credit_deductions') || ! Schema::hasColumn('credit_deductions', 'payroll_slip_id')) {
            return;
        }

        Schema::table('credit_deductions', function (Blueprint $table): void {
            $table->dropUnique('credit_deductions_payroll_slip_credit_unique');
            $table->dropConstrainedForeignId('payroll_slip_id');
        });
    }
};
