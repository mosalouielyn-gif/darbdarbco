<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('production_box_records')) {
            return;
        }

        Schema::table('production_box_records', function (Blueprint $table) {
            if (! Schema::hasColumn('production_box_records', 'beneficiary_name')) {
                $table->string('beneficiary_name')->nullable()->after('beneficiary_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('production_box_records') || ! Schema::hasColumn('production_box_records', 'beneficiary_name')) {
            return;
        }

        Schema::table('production_box_records', function (Blueprint $table) {
            $table->dropColumn('beneficiary_name');
        });
    }
};
