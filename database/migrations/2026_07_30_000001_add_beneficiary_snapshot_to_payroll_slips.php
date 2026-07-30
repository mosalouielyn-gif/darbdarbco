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
            if (! Schema::hasColumn('payroll_slips', 'beneficiary_name')) {
                $table->string('beneficiary_name')->nullable()->after('beneficiary_id');
            }
            if (! Schema::hasColumn('payroll_slips', 'beneficiary_code')) {
                $table->string('beneficiary_code')->nullable()->after('beneficiary_name');
            }
            if (! Schema::hasColumn('payroll_slips', 'beneficiary_contact_number')) {
                $table->string('beneficiary_contact_number')->nullable()->after('beneficiary_code');
            }
            if (! Schema::hasColumn('payroll_slips', 'beneficiary_address')) {
                $table->text('beneficiary_address')->nullable()->after('beneficiary_contact_number');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('payroll_slips')) {
            return;
        }

        Schema::table('payroll_slips', function (Blueprint $table) {
            foreach (['beneficiary_address', 'beneficiary_contact_number', 'beneficiary_code'] as $column) {
                if (Schema::hasColumn('payroll_slips', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
