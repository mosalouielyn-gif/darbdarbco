<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('restock_requests')) {
            return;
        }

        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("
            ALTER TABLE restock_requests
            DROP CONSTRAINT IF EXISTS restock_requests_status_check
        ");

        DB::statement("
            ALTER TABLE restock_requests
            ADD CONSTRAINT restock_requests_status_check
            CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed'))
        ");
    }

    public function down(): void
    {
        if (! Schema::hasTable('restock_requests')) {
            return;
        }

        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::table('restock_requests')
            ->where('status', 'Cancelled')
            ->update(['status' => 'Rejected']);

        DB::statement("
            ALTER TABLE restock_requests
            DROP CONSTRAINT IF EXISTS restock_requests_status_check
        ");

        DB::statement("
            ALTER TABLE restock_requests
            ADD CONSTRAINT restock_requests_status_check
            CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed'))
        ");
    }
};
