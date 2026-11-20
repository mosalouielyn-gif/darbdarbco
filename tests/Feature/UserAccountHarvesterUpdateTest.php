<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UserAccountHarvesterUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_update_harvester(): void
    {
        $harvester = User::factory()->create([
            'role' => 'harvester',
            'active' => true,
        ]);

        $this->putJson("/api/harvesters/{$harvester->id}", [
            'name' => 'Changed Name',
            'contact' => '0900-000-0000',
            'address' => 'Changed address',
            'active' => false,
        ])->assertUnauthorized();

        $this->assertDatabaseHas('users', [
            'id' => $harvester->id,
            'name' => $harvester->name,
            'active' => true,
        ]);
    }

    public function test_manager_updates_existing_harvester_without_changing_identity_or_historical_production(): void
    {
        $manager = User::factory()->create([
            'name' => 'Manager Admin',
            'role' => 'manager_admin',
            'active' => true,
        ]);
        $harvester = User::factory()->create([
            'name' => 'Before Name',
            'role' => 'harvester',
            'active' => true,
        ]);

        DB::table('users')->where('id', $harvester->id)->update([
            'username' => 'HAR-007',
            'contact_information' => '0900-000-2007',
            'remarks' => 'Old address',
        ]);
        $harvestRecordId = DB::table('harvest_records')->insertGetId([
            'harvest_date' => '2026-11-19',
            'beneficiary_name' => 'Historical Beneficiary',
            'harvester_name' => 'Before Name',
            'created_by' => $manager->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $usersBefore = DB::table('users')->count();

        $this->actingAs($manager, 'web')->putJson("/api/harvesters/{$harvester->id}", [
            'name' => 'Updated Name',
            'contact' => '0900-111-2222',
            'address' => 'Updated address',
            'active' => false,
            'admin_id' => 999999,
            'admin_name' => 'Forged Actor',
            'username' => 'CHANGED-CODE',
            'role' => 'manager_admin',
        ])
            ->assertOk()
            ->assertJsonPath('id', $harvester->id)
            ->assertJsonPath('name', 'Updated Name')
            ->assertJsonPath('username', 'HAR-007')
            ->assertJsonPath('role', 'harvester')
            ->assertJsonPath('active', 0)
            ->assertJsonPath('contact_information', '0900-111-2222')
            ->assertJsonPath('remarks', 'Updated address');

        $this->assertDatabaseCount('users', $usersBefore);
        $this->assertDatabaseHas('users', [
            'id' => $harvester->id,
            'username' => 'HAR-007',
            'role' => 'harvester',
            'name' => 'Updated Name',
            'contact_information' => '0900-111-2222',
            'remarks' => 'Updated address',
            'active' => false,
        ]);
        $this->assertDatabaseHas('harvest_records', [
            'id' => $harvestRecordId,
            'harvester_name' => 'Before Name',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $manager->id,
            'user_name' => 'Manager Admin',
            'module' => 'Users',
            'action' => 'Updated',
        ]);
        $this->assertDatabaseMissing('audit_logs', ['user_name' => 'Forged Actor']);

        $refreshedAppData = $this->getJson('/api/app-data?role=manager_admin')->assertOk()->json();
        $refreshedHarvester = collect($refreshedAppData['users'])->firstWhere('id', $harvester->id);
        $this->assertSame('Updated Name', $refreshedHarvester['name']);
        $this->assertSame('HAR-007', $refreshedHarvester['username']);
    }

    public function test_non_manager_cannot_update_harvester(): void
    {
        $payrollPersonnel = User::factory()->create([
            'role' => 'payroll_personnel',
            'active' => true,
        ]);
        $harvester = User::factory()->create([
            'role' => 'harvester',
            'active' => true,
        ]);

        $this->actingAs($payrollPersonnel, 'web')->putJson("/api/harvesters/{$harvester->id}", [
            'name' => 'Changed Name',
            'contact' => '0900-000-0000',
            'address' => 'Changed address',
            'active' => false,
        ])->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $harvester->id,
            'name' => $harvester->name,
            'active' => true,
        ]);
    }

    public function test_invalid_harvester_information_is_rejected_without_saving(): void
    {
        $manager = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);
        $harvester = User::factory()->create([
            'role' => 'harvester',
            'active' => true,
        ]);

        $this->actingAs($manager, 'web')->putJson("/api/harvesters/{$harvester->id}", [
            'name' => ' ',
            'contact' => str_repeat('1', 256),
            'address' => str_repeat('a', 2001),
            'active' => 'not-a-status',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'contact', 'address', 'active']);

        $this->assertDatabaseHas('users', [
            'id' => $harvester->id,
            'name' => $harvester->name,
            'active' => true,
        ]);
    }

    public function test_update_endpoint_does_not_accept_a_non_harvester_account(): void
    {
        $manager = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);
        $otherAccount = User::factory()->create([
            'role' => 'production_clerk',
            'active' => true,
        ]);

        $this->actingAs($manager, 'web')->putJson("/api/harvesters/{$otherAccount->id}", [
            'name' => 'Changed Name',
            'contact' => '0900-000-0000',
            'address' => 'Changed address',
            'active' => true,
        ])->assertNotFound();

        $this->assertDatabaseHas('users', [
            'id' => $otherAccount->id,
            'name' => $otherAccount->name,
            'role' => 'production_clerk',
        ]);
    }

    public function test_existing_harvester_activation_endpoint_still_updates_status(): void
    {
        $manager = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);
        $harvester = User::factory()->create([
            'role' => 'harvester',
            'active' => true,
        ]);

        $this->actingAs($manager, 'web')->putJson("/api/users/{$harvester->id}/status", [
            'active' => false,
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $harvester->id,
            'active' => false,
        ]);
    }
}
