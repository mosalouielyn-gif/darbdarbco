<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_slips') || ! Schema::hasTable('payroll_slip_production_records')) return;

        $sourceColumns = [
            'production_box_record_id' => 'production_box_records',
            'production_record_id' => 'production_records',
        ];
        $slipColumns = ['id'];
        foreach (array_keys($sourceColumns) as $column) {
            if (Schema::hasColumn('payroll_slips', $column)) $slipColumns[] = $column;
        }
        if (Schema::hasColumn('payroll_slips', 'harvest_date')) $slipColumns[] = 'harvest_date';

        foreach (DB::table('payroll_slips')->select($slipColumns)->get() as $slip) {
            foreach ($sourceColumns as $column => $table) {
                if (! isset($slip->{$column}) || ! Schema::hasTable($table)) continue;
                $record = DB::table($table)->where('id', $slip->{$column})->first();
                $recordDate = $record->harvest_date ?? $record->production_date ?? $record->packing_date ?? null;
                DB::table('payroll_slip_production_records')->insertOrIgnore([
                    'payroll_slip_id' => $slip->id,
                    'source_table' => $table,
                    'production_record_id' => $slip->{$column},
                    'harvest_date' => $recordDate ?? ($slip->harvest_date ?? null),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Backfilled links are retained to preserve payroll history.
    }
};
