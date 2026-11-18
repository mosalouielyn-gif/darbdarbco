<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_slips') || ! Schema::hasTable('payroll_slip_production_records') ||
            ! Schema::hasColumn('payroll_slips', 'beneficiary_id') || ! Schema::hasColumn('payroll_slips', 'harvest_date')) return;

        foreach (DB::table('payroll_slips')->whereNotNull('beneficiary_id')->whereNotNull('harvest_date')->get() as $slip) {
            if (DB::table('payroll_slip_production_records')->where('payroll_slip_id', $slip->id)->exists()) continue;
            $candidates = [];
            foreach ([
                ['table' => 'production_records', 'date_columns' => ['harvest_date', 'packing_date']],
                ['table' => 'production_box_records', 'date_columns' => ['production_date', 'harvest_date']],
            ] as $source) {
                $table = $source['table'];
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'beneficiary_id')) continue;
                $dateColumn = collect($source['date_columns'])->first(fn ($column) => Schema::hasColumn($table, $column));
                if (! $dateColumn) continue;
                $matches = DB::table($table)->where('beneficiary_id', $slip->beneficiary_id)->whereDate($dateColumn, $slip->harvest_date)->get(['id', $dateColumn]);
                foreach ($matches as $record) {
                    $candidates[] = ['table' => $table, 'id' => $record->id, 'date' => $record->{$dateColumn}];
                }
            }
            if (count($candidates) !== 1) continue;
            $candidate = $candidates[0];
            DB::table('payroll_slip_production_records')->insertOrIgnore([
                'payroll_slip_id' => $slip->id,
                'source_table' => $candidate['table'],
                'production_record_id' => $candidate['id'],
                'harvest_date' => $candidate['date'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Exact-match links are retained because they now identify the source of existing payroll totals.
    }
};
