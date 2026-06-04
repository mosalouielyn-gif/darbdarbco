<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_transactions')) {
            return;
        }

        DB::statement('ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_txn_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE stock_transactions
            ADD CONSTRAINT stock_transactions_txn_type_check
            CHECK (txn_type IN (
                'Stock In',
                'Cash Purchase',
                'Credit Issued',
                'Adjustment',
                'Stock Out (Expired)',
                'Direct Release',
                'Borrowed Material',
                'Internal Use'
            ))
        SQL);
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_transactions')) {
            return;
        }

        DB::statement('ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_txn_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE stock_transactions
            ADD CONSTRAINT stock_transactions_txn_type_check
            CHECK (txn_type IN (
                'Stock In',
                'Cash Purchase',
                'Credit Issued',
                'Adjustment',
                'Stock Out (Expired)'
            ))
        SQL);
    }
};
