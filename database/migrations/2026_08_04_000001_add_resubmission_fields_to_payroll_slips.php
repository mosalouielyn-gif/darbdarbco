<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_slips')) {
            return;
        }

        Schema::table('payroll_slips', function (Blueprint $table) {
            if (! Schema::hasColumn('payroll_slips', 'return_category')) {
                $table->string('return_category')->nullable();
            }

            if (! Schema::hasColumn('payroll_slips', 'return_reason')) {
                $table->text('return_reason')->nullable();
            }

            if (! Schema::hasColumn('payroll_slips', 'return_remarks')) {
                $table->text('return_remarks')->nullable();
            }

            if (! Schema::hasColumn('payroll_slips', 'returned_by')) {
                $table->foreignId('returned_by')->nullable()->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('payroll_slips', 'returned_at')) {
                $table->timestamp('returned_at')->nullable();
            }

            if (! Schema::hasColumn('payroll_slips', 'resubmitted_at')) {
                $table->timestamp('resubmitted_at')->nullable();
            }

            if (! Schema::hasColumn('payroll_slips', 'resubmission_count')) {
                $table->unsignedInteger('resubmission_count')->default(0);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('payroll_slips')) {
            return;
        }

        Schema::table('payroll_slips', function (Blueprint $table) {
            foreach ([
                'return_category',
                'return_reason',
                'return_remarks',
                'returned_by',
                'returned_at',
                'resubmitted_at',
                'resubmission_count',
            ] as $column) {
                if (Schema::hasColumn('payroll_slips', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
