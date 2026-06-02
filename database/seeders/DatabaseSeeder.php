<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $accounts = [
            ['name' => 'Maria Santos', 'email' => 'clerk@darbco.coop', 'username' => 'maria.santos', 'password' => 'clerk123', 'role' => 'production_clerk'],
            ['name' => 'Jose Reyes', 'email' => 'inventory@darbco.coop', 'username' => 'jose.reyes', 'password' => 'inv123', 'role' => 'inventory_bookkeeper'],
            ['name' => 'Ana Dela Cruz', 'email' => 'payroll@darbco.coop', 'username' => 'ana.delacruz', 'password' => 'pay123', 'role' => 'payroll_personnel'],
            ['name' => 'Pedro Mendoza', 'email' => 'finance@darbco.coop', 'username' => 'pedro.mendoza', 'password' => 'fin123', 'role' => 'finance_officer'],
            ['name' => 'Cecilia Aquino', 'email' => 'admin@darbco.coop', 'username' => 'cecilia.aquino', 'password' => 'admin123', 'role' => 'manager_admin'],
        ];

        if ($this->usesExistingDarbcoSchema()) {
            foreach ($accounts as $account) {
                $roleId = DB::table('roles')->where('code', $account['role'])->value('id');

                DB::table('users')->updateOrInsert(
                    ['email' => $account['email']],
                    [
                        'full_name' => $account['name'],
                        'username' => $account['username'],
                        'password_hash' => Hash::make($account['password']),
                        'role_id' => $roleId,
                        'is_active' => 1,
                        'updated_at' => now(),
                    ],
                );
            }

            return;
        }

        foreach ($accounts as $account) {
            User::query()->updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'username' => $account['username'],
                    'password' => Hash::make($account['password']),
                    'role' => $account['role'],
                    'active' => true,
                ],
            );
        }
    }

    private function usesExistingDarbcoSchema(): bool
    {
        return Schema::hasTable('roles')
            && Schema::hasColumn('users', 'full_name')
            && Schema::hasColumn('users', 'password_hash')
            && Schema::hasColumn('users', 'role_id');
    }
}
