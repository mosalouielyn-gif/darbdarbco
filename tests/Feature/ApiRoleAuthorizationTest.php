<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiRoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sensitive_reads_and_writes_require_a_server_session(): void
    {
        $this->getJson('/api/app-data')->assertUnauthorized();
        $this->getJson('/api/database-maintenance/tables')->assertUnauthorized();
        $this->postJson('/api/payroll-slips', [])->assertUnauthorized();
        $this->postJson('/api/sales/checkouts', [])->assertUnauthorized();
        $this->deleteJson('/api/database-maintenance/tables', [])->assertUnauthorized();
    }

    public function test_authenticated_wrong_roles_are_forbidden_before_mutation(): void
    {
        $financeOfficer = $this->createRoleUser('finance_officer');
        $this->actingAs($financeOfficer, 'web');

        $this->postJson('/api/harvest-records', [])->assertForbidden();
        $this->postJson('/api/sales/checkouts', [])->assertForbidden();
        $this->deleteJson('/api/database-maintenance/tables', [])->assertForbidden();

        $this->assertDatabaseCount('harvest_records', 0);
    }

    public function test_inactive_authenticated_accounts_are_forbidden(): void
    {
        $inactiveManager = $this->createRoleUser('manager_admin', active: false);
        $this->actingAs($inactiveManager, 'web');

        $this->getJson('/api/database-maintenance/tables')->assertForbidden();
    }

    public function test_app_data_role_is_derived_from_the_authenticated_account(): void
    {
        $bookkeeper = $this->createRoleUser('inventory_bookkeeper');
        $this->actingAs($bookkeeper, 'web');

        $this->getJson('/api/app-data?role=manager_admin')->assertForbidden();
        $this->getJson('/api/app-data?role=inventory_bookkeeper')->assertOk();
    }

    public function test_manager_role_passes_authorization_and_unauthorized_roles_cannot_run_maintenance(): void
    {
        $manager = $this->createRoleUser('manager_admin');
        $this->actingAs($manager, 'web');

        $this->postJson('/api/admin/verify-password', [
            'user_id' => $this->createRoleUser('finance_officer')->id,
            'email' => $manager->email,
            'password' => 'password',
        ])->assertOk()->assertJsonPath('verified', true);

        $this->deleteJson('/api/database-maintenance/tables', [
            'confirmation' => 'not the required phrase',
        ])->assertUnprocessable();

        $bookkeeper = $this->createRoleUser('inventory_bookkeeper');
        $this->actingAs($bookkeeper, 'web');

        $this->deleteJson('/api/database-maintenance/tables', [
            'confirmation' => 'DELETE ALL DATABASE DATA',
            'user_id' => $manager->id,
            'user_name' => $manager->name,
            'role' => 'manager_admin',
        ])->assertForbidden();
    }

    public function test_harvest_read_access_remains_available_across_operational_roles(): void
    {
        $payrollPersonnel = $this->createRoleUser('payroll_personnel');
        $this->actingAs($payrollPersonnel, 'web');

        $this->getJson('/api/harvest-records')->assertOk();
        $this->getJson('/api/production-box-records')->assertOk();
    }

    public function test_request_supplied_role_and_actor_ids_do_not_grant_access(): void
    {
        $productionClerk = $this->createRoleUser('production_clerk');
        $forgedManager = $this->createRoleUser('manager_admin');
        $this->actingAs($productionClerk, 'web');

        $this->getJson('/api/database-maintenance/tables?role=manager_admin')->assertForbidden();
        $this->deleteJson('/api/database-maintenance/tables', [
            'confirmation' => 'DELETE ALL DATABASE DATA',
            'admin_id' => $forgedManager->id,
            'admin_name' => $forgedManager->name,
            'user_id' => $forgedManager->id,
            'user_name' => $forgedManager->name,
            'role' => 'manager_admin',
        ])->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $forgedManager->id, 'active' => true]);
    }

    private function createRoleUser(string $role, bool $active = true): User
    {
        return User::factory()->create([
            'role' => $role,
            'active' => $active,
        ]);
    }
}
