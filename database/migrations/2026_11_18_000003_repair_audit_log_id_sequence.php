<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql' || ! Schema::hasTable('audit_logs') || ! Schema::hasColumn('audit_logs', 'id')) {
            return;
        }

        DB::statement(<<<'SQL'
            DO $repair$
            DECLARE
                sequence_name text := pg_get_serial_sequence('audit_logs', 'id');
                highest_id bigint;
            BEGIN
                IF sequence_name IS NOT NULL THEN
                    SELECT MAX(id) INTO highest_id FROM audit_logs;
                    IF highest_id IS NULL THEN
                        PERFORM setval(sequence_name, 1, false);
                    ELSE
                        PERFORM setval(sequence_name, highest_id, true);
                    END IF;
                END IF;
            END
            $repair$
        SQL);
    }

    public function down(): void
    {
        // Keep the sequence aligned with existing audit history.
    }
};
