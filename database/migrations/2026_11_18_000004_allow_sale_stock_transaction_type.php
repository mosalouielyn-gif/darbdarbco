<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ALLOWED_TYPES = [
        'Stock In',
        'Cash Purchase',
        'Credit Issued',
        'Adjustment',
        'Stock Out (Expired)',
        'Direct Release',
        'Borrowed Material',
        'Internal Use',
        'Returned Material',
        'Sale',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! Schema::hasTable('stock_transactions')) {
            return;
        }

        DB::statement('ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_txn_type_check');
        $types = implode(', ', array_map(static fn (string $type): string => DB::getPdo()->quote($type), self::ALLOWED_TYPES));
        DB::statement("ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_txn_type_check CHECK (txn_type IN ({$types}))");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! Schema::hasTable('stock_transactions')) {
            return;
        }

        // Keep Sale permitted once sales have been recorded, so rollback cannot
        // invalidate existing transaction history.
        if (DB::table('stock_transactions')->where('txn_type', 'Sale')->exists()) {
            return;
        }

        DB::statement('ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_txn_type_check');
        $types = array_values(array_filter(self::ALLOWED_TYPES, static fn (string $type): bool => $type !== 'Sale'));
        $quotedTypes = implode(', ', array_map(static fn (string $type): string => DB::getPdo()->quote($type), $types));
        DB::statement("ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_txn_type_check CHECK (txn_type IN ({$quotedTypes}))");
    }
};
