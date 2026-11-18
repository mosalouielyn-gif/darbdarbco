<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! Schema::hasTable('inventory_items')) {
            return;
        }

        DB::statement('ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_unit_check');
        DB::statement("ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_check CHECK (unit IN ('kg', 'pcs', 'pairs', 'liter'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! Schema::hasTable('inventory_items')) {
            return;
        }

        DB::statement('ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_unit_check');
        DB::statement("ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_check CHECK (unit IN ('kg', 'pcs', 'liter'))");
    }
};
