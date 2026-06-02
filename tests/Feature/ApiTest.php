<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_database_user(): void
    {
        User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);

        $this->postJson('/api/login', [
            'email' => 'clerk@darbco.coop',
            'password' => 'clerk123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'production_clerk')
            ->assertJsonPath('user.email', 'clerk@darbco.coop');
    }

    public function test_app_data_endpoint_returns_expected_sections(): void
    {
        $this->getJson('/api/app-data')
            ->assertOk()
            ->assertJsonStructure([
                'beneficiaries',
                'productionRecords',
                'dailyBoxes',
                'inventoryItems',
                'stockTransactions',
                'restockRequests',
                'payrollSlips',
                'auditLogs',
                'users',
            ]);
    }
}
