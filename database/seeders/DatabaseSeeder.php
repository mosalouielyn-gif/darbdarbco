<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        User::query()->firstOrCreate(
            ['email' => 'clerk@darbco.coop'],
            [
                'name' => 'DARBCO Production Clerk',
                'username' => 'maria.santos',
                'password' => Hash::make('clerk123'),
                'role' => 'production_clerk',
                'active' => true,
            ],
        );
    }
}
