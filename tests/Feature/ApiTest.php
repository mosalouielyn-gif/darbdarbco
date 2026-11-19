<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
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

    public function test_local_clerk_account_can_sign_in_after_database_seeding(): void
    {
        $this->seed();

        $this->postJson('/api/login', [
            'email' => 'clerk@darbco.coop',
            'password' => 'clerk123',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'clerk@darbco.coop')
            ->assertJsonPath('user.role', 'production_clerk');

        $this->assertDatabaseHas('users', [
            'email' => 'clerk@darbco.coop',
            'active' => true,
        ]);
    }

    public function test_login_supports_legacy_users_table_without_role_or_status_columns(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_username_unique');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['username', 'role', 'active', 'last_login_at', 'contact_information', 'remarks']);
        });

        DB::table('users')->insert([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'password' => Hash::make('clerk123'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('/api/login', [
            'email' => 'clerk@darbco.coop',
            'password' => 'clerk123',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'clerk@darbco.coop')
            ->assertJsonPath('user.role', 'production_clerk');
    }

    public function test_app_data_endpoint_returns_expected_sections(): void
    {
        $this->actAsRole('manager_admin');

        $this->getJson('/api/app-data?role=manager_admin')
            ->assertOk()
            ->assertJsonStructure([
                'beneficiaries',
                'harvestRecords',
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

    public function test_inventory_bookkeeper_app_data_returns_all_master_beneficiaries_without_production_records(): void
    {
        $this->actAsRole('inventory_bookkeeper');
        $maricelId = $this->createBeneficiary('Maricel D. Villanueva');
        $junreyId = $this->createBeneficiary('Junrey P. Salazar');
        $rowenaId = $this->createBeneficiary('Rowena C. Mendoza');
        $this->createBeneficiary('Inactive Beneficiary', false);

        $this->getJson('/api/app-data?role=inventory_bookkeeper')
            ->assertOk()
            ->assertJsonCount(4, 'beneficiaries')
            ->assertJsonFragment([
                'id' => $maricelId,
                'code' => 'BEN-TEST-1',
                'name' => 'Maricel D. Villanueva',
                'active' => 1,
            ])
            ->assertJsonFragment([
                'id' => $junreyId,
                'code' => 'BEN-TEST-2',
                'name' => 'Junrey P. Salazar',
                'active' => 1,
            ])
            ->assertJsonFragment([
                'id' => $rowenaId,
                'code' => 'BEN-TEST-3',
                'name' => 'Rowena C. Mendoza',
                'active' => 1,
            ])
            ->assertJsonPath('harvestRecords', [])
            ->assertJsonPath('productionRecords', []);
    }

    public function test_harvest_record_can_be_created_and_audited(): void
    {
        $beneficiaryId = $this->createBeneficiary('Rowena C. Mendoza');
        $nameMatchId = $this->createBeneficiary('Mendoza, Rowena C.');
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);
        $this->actingAs($user, 'web');
        $forgedActor = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);

        $this->postJson('/api/harvest-records', [
            'harvest_date' => '2026-05-30',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Mendoza, Rowena C.',
            'harvester_name' => 'Daniel Cruz',
            'buligs_11_weeks' => 4,
            'buligs_12_weeks' => 6,
            'buligs_13_weeks' => 5,
            'buligs_14_weeks' => 1,
            'user_id' => $forgedActor->id,
            'user_name' => 'Forged Manager Actor',
            'role' => 'manager_admin',
        ])
            ->assertCreated()
            ->assertJsonPath('beneficiary_id', $beneficiaryId)
            ->assertJsonPath('beneficiary_name', 'Rowena C. Mendoza')
            ->assertJsonPath('total_buligs', 16);

        $this->assertDatabaseHas('harvest_records', [
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Rowena C. Mendoza',
            'harvester_name' => 'Daniel Cruz',
            'total_buligs' => 16,
            'created_by' => $user->id,
        ]);
        $this->assertNotSame($beneficiaryId, $nameMatchId);
        $this->assertDatabaseCount('beneficiaries', 2);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'user_name' => 'Maria Santos',
            'module' => 'Production',
            'action' => 'Created',
            'status' => 'Completed',
        ]);
    }

    public function test_harvest_record_can_be_updated_and_deleted_with_audit_logs(): void
    {
        $beneficiaryId = $this->createBeneficiary('SALUDEZ LISA');
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);
        $this->actingAs($user, 'web');

        $id = DB::table('harvest_records')->insertGetId([
            'harvest_date' => '2026-05-30',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'SALUDEZ LISA',
            'harvester_name' => 'Daniel Cruz',
            'buligs_11_weeks' => 4,
            'buligs_12_weeks' => 6,
            'buligs_13_weeks' => 5,
            'buligs_14_weeks' => 1,
            'total_buligs' => 16,
            'created_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->putJson("/api/harvest-records/{$id}", [
            'harvest_date' => '2026-05-31',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'SALUDEZ LISA',
            'harvester_name' => 'Daniel Cruz',
            'buligs_11_weeks' => 1,
            'buligs_12_weeks' => 2,
            'buligs_13_weeks' => 3,
            'buligs_14_weeks' => 4,
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])
            ->assertOk()
            ->assertJsonPath('total_buligs', 10);

        $this->assertDatabaseHas('harvest_records', [
            'id' => $id,
            'harvest_date' => '2026-05-31',
            'total_buligs' => 10,
        ]);

        $this->deleteJson("/api/harvest-records/{$id}", [
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])->assertOk();

        $this->assertDatabaseMissing('harvest_records', ['id' => $id]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'module' => 'Production',
            'action' => 'Updated',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'module' => 'Production',
            'action' => 'Deleted',
        ]);
    }

    public function test_production_box_record_can_be_created_and_audited(): void
    {
        $beneficiaryId = $this->createBeneficiary('Rowena C. Mendoza');
        $nameMatchId = $this->createBeneficiary('Mendoza, Rowena C.');
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/production-box-records', [
            'production_date' => '2026-06-03',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Mendoza, Rowena C.',
            'class_a_big_hands' => 45,
            'class_a_small_hands' => 30,
            'class_a_cps' => 12,
            'class_b_big_hands' => 20,
            'class_b_small_hands' => 15,
            'class_b_cps' => 8,
            'special_product' => 5,
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])
            ->assertCreated()
            ->assertJsonPath('beneficiary_id', $beneficiaryId)
            ->assertJsonPath('beneficiary_name', 'Rowena C. Mendoza')
            ->assertJsonPath('class_a_big_hands', 45)
            ->assertJsonMissingPaths([
                'defects_11_weeks',
                'defects_12_weeks',
                'defects_13_weeks',
                'defects_14_weeks',
                'rejects_11_weeks',
                'rejects_12_weeks',
                'rejects_13_weeks',
                'rejects_14_weeks',
            ]);

        $this->assertDatabaseHas('production_box_records', [
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Rowena C. Mendoza',
            'class_a_big_hands' => 45,
            'class_b_big_hands' => 20,
            'special_product' => 5,
            'created_by' => $user->id,
        ]);
        $this->assertNotSame($beneficiaryId, $nameMatchId);
        $this->assertDatabaseCount('beneficiaries', 2);

        $this->getJson('/api/app-data?role=production_clerk')
            ->assertOk()
            ->assertJsonPath('productionRecords.0.id', $response->json('id'))
            ->assertJsonPath('productionRecords.0.class_a_big_hands', 45)
            ->assertJsonPath('productionRecords.0.class_b_big_hands', 20)
            ->assertJsonPath('productionRecords.0.special_total', 5)
            ->assertJsonMissingPaths([
                'productionRecords.0.defects_11_weeks',
                'productionRecords.0.rejects_11_weeks',
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'user_name' => 'Maria Santos',
            'module' => 'Production',
            'action' => 'Created',
        ]);
    }

    public function test_production_box_record_can_be_updated_and_deleted_with_audit_logs(): void
    {
        $beneficiaryId = $this->createBeneficiary('Juan Dela Cruz');
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);
        $this->actingAs($user, 'web');

        $id = DB::table('production_box_records')->insertGetId([
            'record_no' => 'PBR-TEST-001',
            'production_date' => '2026-06-03',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Juan Dela Cruz',
            'class_a_big_hands' => 45,
            'class_a_small_hands' => 30,
            'class_a_cps' => 12,
            'class_b_big_hands' => 20,
            'class_b_small_hands' => 15,
            'class_b_cps' => 8,
            'special_product' => 5,
            'defects_11_weeks' => 2,
            'rejects_11_weeks' => 1,
            'created_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->putJson("/api/production-box-records/{$id}", [
            'production_date' => '2026-06-04',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Juan Dela Cruz',
            'class_a_big_hands' => 50,
            'class_a_small_hands' => 31,
            'class_a_cps' => 13,
            'class_b_big_hands' => 21,
            'class_b_small_hands' => 16,
            'class_b_cps' => 9,
            'special_product' => 6,
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])
            ->assertOk()
            ->assertJsonPath('production_date', '2026-06-04')
            ->assertJsonPath('class_a_big_hands', 50)
            ->assertJsonMissingPaths([
                'defects_11_weeks',
                'rejects_11_weeks',
            ]);

        $this->assertDatabaseHas('production_box_records', [
            'id' => $id,
            'production_date' => '2026-06-04',
            'class_a_big_hands' => 50,
            'special_product' => 6,
            'defects_11_weeks' => 2,
            'rejects_11_weeks' => 1,
        ]);

        $this->deleteJson("/api/production-box-records/{$id}", [
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])->assertOk();

        $this->assertDatabaseMissing('production_box_records', ['id' => $id]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'module' => 'Production',
            'action' => 'Updated',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'module' => 'Production',
            'action' => 'Deleted',
        ]);
    }

    public function test_harvest_and_production_records_reject_missing_or_invalid_beneficiary_ids(): void
    {
        $this->actAsRole('production_clerk');
        $beneficiaryCount = DB::table('beneficiaries')->count();
        $harvestPayload = [
            'harvest_date' => '2026-05-30',
            'harvester_name' => 'Daniel Cruz',
            'buligs_11_weeks' => 4,
            'buligs_12_weeks' => 6,
            'buligs_13_weeks' => 5,
            'buligs_14_weeks' => 1,
        ];
        $productionPayload = [
            'production_date' => '2026-06-03',
            'class_a_big_hands' => 45,
            'class_a_small_hands' => 30,
            'class_a_cps' => 12,
            'class_b_big_hands' => 20,
            'class_b_small_hands' => 15,
            'class_b_cps' => 8,
            'special_product' => 5,
        ];

        $this->postJson('/api/harvest-records', $harvestPayload)
            ->assertUnprocessable()
            ->assertJsonPath('errors.beneficiary_id.0', 'Select a registered beneficiary.');
        $this->postJson('/api/harvest-records', $harvestPayload + ['beneficiary_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonPath('errors.beneficiary_id.0', 'The selected beneficiary is not registered.');
        $this->postJson('/api/production-box-records', $productionPayload)
            ->assertUnprocessable()
            ->assertJsonPath('errors.beneficiary_id.0', 'Select a registered beneficiary.');
        $this->postJson('/api/production-box-records', $productionPayload + ['beneficiary_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonPath('errors.beneficiary_id.0', 'The selected beneficiary is not registered.');

        $this->assertDatabaseCount('beneficiaries', $beneficiaryCount);
        $this->assertDatabaseCount('harvest_records', 0);
        $this->assertDatabaseCount('production_box_records', 0);
    }

    private function createBeneficiary(string $name, bool $active = true): int
    {
        $nextCode = 'BEN-TEST-'.(DB::table('beneficiaries')->count() + 1);

        return (int) DB::table('beneficiaries')->insertGetId([
            'beneficiary_code' => $nextCode,
            'name' => $name,
            'active' => $active,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function actAsRole(string $role): User
    {
        $user = User::factory()->create([
            'role' => $role,
            'active' => true,
        ]);

        $this->actingAs($user, 'web');

        return $user;
    }
}
