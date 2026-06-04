<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inventory_items')) {
            return;
        }

        Schema::table('inventory_items', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_items', 'supplier')) {
                $table->string('supplier')->nullable()->after('unit_cost');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('inventory_items') || ! Schema::hasColumn('inventory_items', 'supplier')) {
            return;
        }

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn('supplier');
        });
    }
};
