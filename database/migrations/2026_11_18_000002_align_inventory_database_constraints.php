<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        if (Schema::hasTable('inventory_items')) {
            DB::statement('ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_unit_check');
            DB::statement(<<<'SQL'
                ALTER TABLE inventory_items
                ADD CONSTRAINT inventory_items_unit_check
                CHECK (unit IN ('kg', 'L', 'pcs', 'roll', 'pair', 'pairs', 'bag')) NOT VALID
            SQL);
        }

        if (Schema::hasTable('stock_transactions')) {
            DB::statement('ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_txn_type_check');
            DB::statement(<<<'SQL'
                ALTER TABLE stock_transactions
                ADD CONSTRAINT stock_transactions_txn_type_check
                CHECK (txn_type IN (
                    'Stock In', 'Cash Purchase', 'Credit Issued', 'Adjustment',
                    'Stock Out (Expired)', 'Direct Release', 'Borrowed Material',
                    'Internal Use', 'Returned Material', 'Sale'
                )) NOT VALID
            SQL);
        }
    }

    public function down(): void
    {
        // Keep the widened constraints in place so existing inventory and sales
        // history remains valid and future writes do not regress.
    }
};
