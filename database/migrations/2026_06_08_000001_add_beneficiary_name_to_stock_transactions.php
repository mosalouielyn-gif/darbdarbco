<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_transactions')) {
            return;
        }

        Schema::table('stock_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('stock_transactions', 'beneficiary_name')) {
                $table->string('beneficiary_name')->nullable()->after('beneficiary_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_transactions') || ! Schema::hasColumn('stock_transactions', 'beneficiary_name')) {
            return;
        }

        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->dropColumn('beneficiary_name');
        });
    }
};
