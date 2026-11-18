<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! Schema::hasTable('beneficiaries')) {
            return;
        }

        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        if (! Schema::hasColumn('beneficiaries', $nameColumn) || ! Schema::hasColumn('beneficiaries', $codeColumn)) {
            return;
        }

        DB::transaction(function () use ($nameColumn, $codeColumn): void {
            $canonical = DB::table('beneficiaries')
                ->whereRaw('lower(trim('.$nameColumn.')) = ?', ['lander vohn namuag'])
                ->orderBy('id')
                ->first();
            $duplicate = DB::table('beneficiaries')
                ->whereRaw('lower(trim('.$nameColumn.')) = ?', ['namuag, lander v.'])
                ->first();

            if (! $canonical || ! $duplicate || (int) $canonical->id === (int) $duplicate->id) {
                return;
            }

            $references = DB::select("SELECT kcu.table_name, kcu.column_name
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.constraint_column_usage ccu
                  ON ccu.constraint_name = kcu.constraint_name
                 AND ccu.constraint_schema = kcu.constraint_schema
                WHERE ccu.constraint_schema = current_schema()
                  AND ccu.table_name = 'beneficiaries'
                  AND ccu.column_name = 'id'
                  AND kcu.table_name <> 'beneficiaries'");

            foreach ($references as $reference) {
                $table = $reference->table_name;
                $column = $reference->column_name;
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                    continue;
                }

                $query = DB::table($table)->where($column, $duplicate->id);
                if (Schema::hasColumn($table, 'beneficiary_name')) {
                    $query->update(['beneficiary_name' => $canonical->{$nameColumn}]);
                }

                $values = [$column => $canonical->id];
                if (Schema::hasColumn($table, 'beneficiary_code')) {
                    $values['beneficiary_code'] = $canonical->{$codeColumn};
                }
                DB::table($table)->where($column, $duplicate->id)->update($values);
            }

            if (Schema::hasTable('credit_transactions') && Schema::hasColumn('credit_transactions', 'beneficiary_account_id')) {
                $query = DB::table('credit_transactions')->where('beneficiary_account_id', $duplicate->id);
                if (Schema::hasColumn('credit_transactions', 'beneficiary_name')) {
                    $query->update(['beneficiary_name' => $canonical->{$nameColumn}]);
                }
                DB::table('credit_transactions')->where('beneficiary_account_id', $duplicate->id)->update([
                    'beneficiary_account_id' => $canonical->id,
                ]);
            }

            DB::table('beneficiaries')->where('id', $duplicate->id)->delete();
        });
    }

    public function down(): void
    {
        // This is a data merge. Recreating a duplicate account would risk splitting
        // production and transaction history again, so rollback intentionally keeps it merged.
    }
};
