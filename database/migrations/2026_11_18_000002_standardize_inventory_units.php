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
        DB::statement("UPDATE inventory_items SET unit = CASE lower(trim(unit))
            WHEN 'l' THEN 'liter'
            WHEN 'liters' THEN 'liter'
            WHEN 'pair' THEN 'pairs'
            WHEN 'rolls' THEN 'roll'
            WHEN 'bags' THEN 'bag'
            ELSE lower(trim(unit))
        END");
        DB::statement("ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_check CHECK (unit IN ('kg', 'liter', 'pcs', 'pairs', 'roll', 'bag'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! Schema::hasTable('inventory_items')) {
            return;
        }

        // Keep the canonical unit set so a rollback cannot strand inventory rows
        // whose unit is roll or bag.
        DB::statement('ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_unit_check');
        DB::statement("ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_check CHECK (unit IN ('kg', 'liter', 'pcs', 'pairs', 'roll', 'bag'))");
    }
};
