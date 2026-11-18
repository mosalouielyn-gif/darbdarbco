<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BeneficiaryCodeGenerator
{
    public function nextCode(): string
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            if (DB::transactionLevel() === 0) {
                return DB::transaction(fn () => $this->nextCode());
            }
            DB::select('SELECT pg_advisory_xact_lock(?)', [824615270]);
        }

        $column = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $max = 0;
        foreach (DB::table('beneficiaries')->pluck($column) as $code) {
            if (preg_match('/^BEN-(\d{1,6})$/i', trim((string) $code), $matches)) {
                $max = max($max, (int) $matches[1]);
            }
        }

        return 'BEN-'.str_pad((string) ($max + 1), 3, '0', STR_PAD_LEFT);
    }
}
