<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PayrollApprovalAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_401_for_unauthenticated_manager_approval(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-AUTH-001');
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-AUTH-001');

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertUnauthorized();

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'approval_status' => 'Pending Manager Approval',
        ]);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    #[DataProvider('unauthorizedPayrollApprovalRoles')]
    public function test_returns_403_when_an_authenticated_non_manager_role_approves_payroll(string $role): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-AUTH-002');
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-AUTH-002');
        $financeOfficer = User::factory()->create([
            'role' => $role,
            'active' => true,
        ]);
        $this->actingAs($financeOfficer, 'web');

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertForbidden();

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'approval_status' => 'Pending Manager Approval',
        ]);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    public static function unauthorizedPayrollApprovalRoles(): array
    {
        return [
            'production clerk' => ['production_clerk'],
            'inventory bookkeeper' => ['inventory_bookkeeper'],
            'payroll personnel' => ['payroll_personnel'],
            'finance officer' => ['finance_officer'],
        ];
    }

    public function test_login_establishes_a_session_that_can_be_restored(): void
    {
        $user = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'role']]);

        $this->assertAuthenticatedAs($user, 'web');

        $this->getJson('/api/session')
            ->assertOk()
            ->assertJsonPath('user.id', (string) $user->id)
            ->assertJsonPath('user.role', 'manager_admin')
            ->assertJsonStructure(['csrf_token']);
    }

    public function test_logout_invalidates_the_server_session(): void
    {
        $user = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);
        $this->actingAs($user, 'web');

        $this->postJson('/api/logout')->assertOk()->assertJsonPath('ok', true);

        $this->assertGuest('web');
        $this->getJson('/api/session')->assertUnauthorized();
    }

    public function test_approval_uses_authenticated_manager_identity_instead_of_forged_payload_identity(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-AUTH-003');
        $creditId = $this->createCreditTransaction('BEN-AUTH-003', 84.25);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-AUTH-003', 84.25);
        $manager = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);
        $forgedUser = User::factory()->create([
            'role' => 'finance_officer',
            'active' => true,
        ]);
        $this->actingAs($manager, 'web');

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [
            'user_id' => $forgedUser->id,
            'user_name' => 'Forged Approver',
        ])->assertOk()->assertJsonPath('approval_status', 'Approved');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'approval_status' => 'Approved',
            'approved_by' => $manager->id,
        ]);
        $this->assertDatabaseHas('credit_deductions', [
            'credit_transaction_id' => $creditId,
            'payroll_slip_id' => $slipId,
            'recorded_by' => $manager->id,
            'recorded_by_name' => $manager->name,
            'amount' => '84.25',
        ]);
    }

    private function createBeneficiary(string $code): int
    {
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $activeColumn = Schema::hasColumn('beneficiaries', 'is_active') ? 'is_active' : 'active';

        return DB::table('beneficiaries')->insertGetId([
            $codeColumn => $code,
            $nameColumn => 'Test Beneficiary',
            $activeColumn => true,
            'created_at' => now(),
        ]);
    }

    private function createCreditTransaction(string $beneficiaryCode, float $balance): int
    {
        return DB::table('credit_transactions')->insertGetId([
            'credit_no' => 'CR-'.$beneficiaryCode,
            'beneficiary_name' => 'Test Beneficiary',
            'beneficiary_account_id' => $beneficiaryCode,
            'material_name' => 'Test material',
            'quantity' => 1,
            'unit' => 'unit',
            'unit_cost' => $balance,
            'amount' => $balance,
            'remaining_balance' => $balance,
            'status' => 'Pending',
            'credit_date' => '2026-11-19',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createPayrollSlip(int $beneficiaryId, string $slipNo, float $creditDeduction = 0): int
    {
        $productionId = DB::table('production_box_records')->insertGetId([
            'production_date' => '2026-11-19',
            'beneficiary_id' => $beneficiaryId,
            'class_a_big_hands' => 1,
            'class_a_small_hands' => 0,
            'class_a_cps' => 0,
            'class_b_big_hands' => 0,
            'class_b_small_hands' => 0,
            'class_b_cps' => 0,
            'special_product' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $payrollSlipId = DB::table('payroll_slips')->insertGetId([
            'slip_no' => $slipNo,
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Test Beneficiary',
            'beneficiary_code' => DB::table('beneficiaries')
                ->where('id', $beneficiaryId)
                ->value(Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code'),
            'payroll_period' => 'November 16-30, 2026',
            'class_a_boxes' => 1,
            'class_b_boxes' => 0,
            'special_boxes' => 0,
            'class_a_price' => 100,
            'class_b_price' => 0,
            'special_price' => 0,
            'credit_deduction' => $creditDeduction,
            'material_deduction' => $creditDeduction,
            'total_deductions' => $creditDeduction,
            'gross_amount' => 100,
            'net_amount' => 100 - $creditDeduction,
            'validation_status' => 'Validated',
            'approval_status' => 'Pending Manager Approval',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('payroll_slip_production_sources')->insert([
            'payroll_slip_id' => $payrollSlipId,
            'source_table' => 'production_box_records',
            'source_record_id' => $productionId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $assessmentBatchId = DB::table('payroll_finance_assessment_batches')->insertGetId([
            'payroll_slip_id' => $payrollSlipId,
            'assessed_by' => null,
            'decision' => 'validated',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('payroll_finance_assessments')->insert(array_map(static fn (string $key): array => [
            'assessment_batch_id' => $assessmentBatchId,
            'assessment_key' => $key,
            'result' => 'Matched',
            'created_at' => now(),
            'updated_at' => now(),
        ], ['beneficiary', 'production', 'classification', 'prices', 'gross', 'credits', 'labor', 'other', 'deductions', 'net']));

        return $payrollSlipId;
    }
}
