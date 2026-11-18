<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HarvesterCodeGenerator
{
    public function nextCode(): string
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            if (DB::transactionLevel() === 0) {
                return DB::transaction(fn () => $this->nextCode());
            }
            DB::select('SELECT pg_advisory_xact_lock(?)', [824615271]);
        }

        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'username')) return 'HAR-001';
        $query = DB::table('users');
        if (Schema::hasColumn('users', 'role_id') && Schema::hasTable('roles')) {
            $query->leftJoin('roles', 'roles.id', '=', 'users.role_id')->where('roles.code', 'harvester');
        } elseif (Schema::hasColumn('users', 'role')) {
            $query->where('role', 'harvester');
        } else {
            $query->where('username', 'like', 'HAR-%');
        }

        $max = 0;
        foreach ($query->pluck('users.username') as $username) {
            if (preg_match('/^HAR-(\d{1,6})$/i', trim((string) $username), $matches)) {
                $max = max($max, (int) $matches[1]);
            }
        }

        return 'HAR-'.str_pad((string) ($max + 1), 3, '0', STR_PAD_LEFT);
    }
}
