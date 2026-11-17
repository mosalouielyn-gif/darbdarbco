<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    public function test_harvest_record_can_be_created_and_audited(): void
    {
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);

        $this->postJson('/api/harvest-records', [
            'harvest_date' => '2026-05-30',
            'beneficiary_name' => 'SALUDEZ LISA',
            'harvester_name' => 'Daniel Cruz',
            'buligs_11_weeks' => 4,
            'buligs_12_weeks' => 6,
            'buligs_13_weeks' => 5,
            'buligs_14_weeks' => 1,
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])
            ->assertCreated()
            ->assertJsonPath('beneficiary_name', 'SALUDEZ LISA')
            ->assertJsonPath('total_buligs', 16);

        $this->assertDatabaseHas('harvest_records', [
            'beneficiary_name' => 'SALUDEZ LISA',
            'harvester_name' => 'Daniel Cruz',
            'total_buligs' => 16,
            'created_by' => $user->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'user_name' => 'Maria Santos',
            'module' => 'Production',
            'action' => 'Created',
            'status' => 'Completed',
        ]);
    }

    public function test_sales_receipt_groups_cash_and_credit_for_all_items(): void
    {
        $user = User::query()->create([
            'name' => 'Inventory User',
            'email' => 'inventory@example.test',
            'username' => 'inventory.user',
            'password' => Hash::make('secret123'),
            'role' => 'inventory_bookkeeper',
            'active' => true,
        ]);
        $beneficiaryId = DB::table('beneficiaries')->insertGetId([
            'beneficiary_code' => 'BEN-SALE-1',
            'name' => 'Sale Beneficiary',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $itemIds = [];
        foreach ([['Item One', 10, 5], ['Item Two', 25, 4]] as [$name, $price, $stock]) {
            $itemIds[] = DB::table('inventory_items')->insertGetId([
                'item_code' => strtoupper(str_replace(' ', '-', $name)),
                'name' => $name,
                'category' => 'Supplies',
                'unit' => 'pcs',
                'on_hand' => $stock,
                'minimum_stock' => 0,
                'unit_cost' => $price,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->postJson('/api/sales-receipts', [
            'receipt_no' => 'POS-TEST-001',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_account_id' => 'BEN-SALE-1',
            'customer_name' => 'Sale Beneficiary',
            'cash_payment' => 30,
            'transaction_date' => '2026-11-18',
            'items' => [
                ['inventory_item_id' => $itemIds[0], 'quantity' => 2, 'unit_price' => 10],
                ['inventory_item_id' => $itemIds[1], 'quantity' => 1, 'unit_price' => 25],
            ],
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])->assertCreated()
            ->assertJsonPath('receipt_no', 'POS-TEST-001')
            ->assertJsonPath('total_amount', 45)
            ->assertJsonPath('cash_payment', 30)
            ->assertJsonPath('credit_amount', 15)
            ->assertJsonCount(2, 'items')
            ->assertJsonCount(1, 'credit_transactions');

        $this->assertDatabaseHas('inventory_items', ['id' => $itemIds[0], 'on_hand' => 3]);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemIds[1], 'on_hand' => 3]);
        $this->assertDatabaseHas('credit_transactions', ['receipt_no' => 'POS-TEST-001', 'amount' => 15]);
        $this->assertSame(2, DB::table('inventory_transactions')->where('receipt_no', 'POS-TEST-001')->count());
        $this->assertDatabaseHas('inventory_transactions', ['receipt_no' => 'POS-TEST-001', 'reason' => 'POS receipt POS-TEST-001; Cash Payment: 5; Credit Amount: 15']);
        $this->assertDatabaseCount('sales_receipts', 1);
        $this->assertDatabaseCount('sales_receipt_items', 2);

        $creditId = DB::table('credit_transactions')->where('receipt_no', 'POS-TEST-001')->value('id');
        $this->postJson("/api/credit-transactions/{$creditId}/deduct", [
            'amount' => 4,
            'payroll_batch' => 'PAYROLL-TEST',
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])->assertOk();
        $this->assertDatabaseHas('sales_receipts', ['receipt_no' => 'POS-TEST-001', 'remaining_balance' => 11]);
    }

    public function test_harvest_record_can_be_updated_and_deleted_with_audit_logs(): void
    {
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);

        $id = DB::table('harvest_records')->insertGetId([
            'harvest_date' => '2026-05-30',
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
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);

        $this->postJson('/api/production-box-records', [
            'production_date' => '2026-06-03',
            'beneficiary_name' => 'Juan Dela Cruz',
            'class_a_big_hands' => 45,
            'class_a_small_hands' => 30,
            'class_a_cps' => 12,
            'class_b_big_hands' => 20,
            'class_b_small_hands' => 15,
            'class_b_cps' => 8,
            'special_product' => 5,
            'defects_11_weeks' => 2,
            'defects_12_weeks' => 3,
            'defects_13_weeks' => 1,
            'defects_14_weeks' => 0,
            'rejects_11_weeks' => 1,
            'rejects_12_weeks' => 2,
            'rejects_13_weeks' => 1,
            'rejects_14_weeks' => 1,
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])
            ->assertCreated()
            ->assertJsonPath('beneficiary_name', 'Juan Dela Cruz')
            ->assertJsonPath('class_a_big_hands', 45);

        $this->assertDatabaseHas('production_box_records', [
            'beneficiary_name' => 'Juan Dela Cruz',
            'class_a_big_hands' => 45,
            'created_by' => $user->id,
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
        $user = User::query()->create([
            'name' => 'Maria Santos',
            'email' => 'clerk@darbco.coop',
            'username' => 'maria.santos',
            'password' => Hash::make('clerk123'),
            'role' => 'production_clerk',
            'active' => true,
        ]);

        $id = DB::table('production_box_records')->insertGetId([
            'record_no' => 'PBR-TEST-001',
            'production_date' => '2026-06-03',
            'beneficiary_name' => 'Juan Dela Cruz',
            'class_a_big_hands' => 45,
            'class_a_small_hands' => 30,
            'class_a_cps' => 12,
            'class_b_big_hands' => 20,
            'class_b_small_hands' => 15,
            'class_b_cps' => 8,
            'special_product' => 5,
            'defects_11_weeks' => 2,
            'defects_12_weeks' => 3,
            'defects_13_weeks' => 1,
            'defects_14_weeks' => 0,
            'rejects_11_weeks' => 1,
            'rejects_12_weeks' => 2,
            'rejects_13_weeks' => 1,
            'rejects_14_weeks' => 1,
            'created_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->putJson("/api/production-box-records/{$id}", [
            'production_date' => '2026-06-04',
            'beneficiary_name' => 'Juan Dela Cruz',
            'class_a_big_hands' => 50,
            'class_a_small_hands' => 31,
            'class_a_cps' => 13,
            'class_b_big_hands' => 21,
            'class_b_small_hands' => 16,
            'class_b_cps' => 9,
            'special_product' => 6,
            'defects_11_weeks' => 3,
            'defects_12_weeks' => 4,
            'defects_13_weeks' => 2,
            'defects_14_weeks' => 1,
            'rejects_11_weeks' => 2,
            'rejects_12_weeks' => 3,
            'rejects_13_weeks' => 2,
            'rejects_14_weeks' => 2,
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])
            ->assertOk()
            ->assertJsonPath('production_date', '2026-06-04')
            ->assertJsonPath('class_a_big_hands', 50);

        $this->assertDatabaseHas('production_box_records', [
            'id' => $id,
            'production_date' => '2026-06-04',
            'class_a_big_hands' => 50,
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
}
