<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! Schema::hasTable('audit_logs') || ! Schema::hasColumn('audit_logs', 'id')) {
            return;
        }

        DB::statement("SELECT setval(pg_get_serial_sequence('audit_logs', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM audit_logs");
    }

    public function down(): void
    {
        // Sequence synchronization is intentionally irreversible; the previous value was stale.
    }
};
