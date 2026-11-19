<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PayrollCreditDeductionApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_posts_the_full_outstanding_credit_balance_after_manager_approval(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-001');
        $creditId = $this->createCreditTransaction('BEN-TEST-001', 125.75);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-001', 'Validated', 125.75);
        $approver = $this->actAsManager();

        $response = $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", []);

        $response->assertOk()->assertJsonPath('approval_status', 'Approved');
        $this->assertDatabaseHas('credit_transactions', [
            'id' => $creditId,
            'remaining_balance' => '0.00',
            'status' => 'Fully Deducted',
        ]);
        $this->assertDatabaseHas('credit_deductions', [
            'credit_transaction_id' => $creditId,
            'payroll_slip_id' => $slipId,
            'amount' => '125.75',
            'recorded_by' => $approver->id,
        ]);
        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'approval_status' => 'Approved',
            'approved_by' => $approver->id,
        ]);
    }

    public function test_posts_each_outstanding_credit_transaction_separately_for_one_beneficiary(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-002');
        $firstCreditId = $this->createCreditTransaction('BEN-TEST-002', 80.00);
        $secondCreditId = $this->createCreditTransaction('BEN-TEST-002', 42.35);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-002', 'Validated', 122.35);
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertOk();

        $this->assertDatabaseCount('credit_deductions', 2);
        $this->assertDatabaseHas('credit_deductions', [
            'credit_transaction_id' => $firstCreditId,
            'payroll_slip_id' => $slipId,
            'amount' => '80.00',
        ]);
        $this->assertDatabaseHas('credit_deductions', [
            'credit_transaction_id' => $secondCreditId,
            'payroll_slip_id' => $slipId,
            'amount' => '42.35',
        ]);
        $this->assertDatabaseHas('credit_transactions', ['id' => $firstCreditId, 'remaining_balance' => '0.00']);
        $this->assertDatabaseHas('credit_transactions', ['id' => $secondCreditId, 'remaining_balance' => '0.00']);
    }

    public function test_draft_creation_and_submission_do_not_post_credit_deductions(): void
    {
        $this->actAsPayrollPersonnel();
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-003');
        $creditId = $this->createCreditTransaction('BEN-TEST-003', 65.00);
        $productionId = DB::table('production_box_records')
            ->where('beneficiary_id', $beneficiaryId)
            ->where('production_date', '2026-11-19')
            ->value('id');
        $productionId = $productionId ? (int) $productionId : $this->createProductionRecord($beneficiaryId);

        $response = $this->postJson('/api/payroll-slips', [
            'slip_no' => 'BP-CREDIT-DRAFT',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Test Beneficiary',
            'beneficiary_code' => 'BEN-TEST-003',
            'production_sources' => [['source_table' => 'production_box_records', 'id' => $productionId]],
            'payroll_period' => 'November 16-30, 2026',
            'class_a_boxes' => 1,
            'class_b_boxes' => 0,
            'special_boxes' => 0,
            'class_a_price' => 100,
            'class_b_price' => 0,
            'special_price' => 0,
            'gross_amount' => 100,
            'credit_deduction' => 65,
            'material_deduction' => 65,
            'total_deductions' => 65,
            'net_amount' => 35,
            'validation_status' => 'Draft',
        ]);
        $response->assertCreated();
        $this->assertSame(65.0, (float) $response->json('credit_deduction'));
        $slipId = (int) $response->json('id');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'credit_deduction' => '65.00',
            'material_deduction' => '65.00',
            'total_deductions' => '65.00',
            'net_amount' => '35.00',
        ]);
        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '65.00']);
        $this->assertDatabaseCount('credit_deductions', 0);

        $this->putJson("/api/payroll-slips/{$slipId}/submit", [])->assertOk();

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '65.00']);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    public function test_finance_validation_does_not_post_credit_deductions(): void
    {
        $this->actAsFinanceOfficer();
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-004');
        $creditId = $this->createCreditTransaction('BEN-TEST-004', 39.50);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-004', 'Submitted for Validation', 39.50);
        $financeUser = User::factory()->create();

        $this->putJson("/api/payroll-slips/{$slipId}/validate", [
            'user_id' => $financeUser->id,
            'user_name' => $financeUser->name,
            'manual_assessments' => $this->financeAssessments(),
        ])->assertOk()->assertJsonPath('validation_status', 'Validated');

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '39.50']);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    public function test_finance_validation_requires_and_persists_all_manual_assessments(): void
    {
        $this->actAsFinanceOfficer();
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-FINANCE-ASSESSMENT');
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-FINANCE-ASSESSMENT', 'Submitted for Validation', 0);

        $this->putJson("/api/payroll-slips/{$slipId}/validate", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('manual_assessments');
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'validation_status' => 'Submitted for Validation']);

        $this->putJson("/api/payroll-slips/{$slipId}/validate", ['manual_assessments' => $this->financeAssessments()])
            ->assertOk()
            ->assertJsonPath('validation_status', 'Validated');

        $this->assertDatabaseHas('payroll_finance_assessment_batches', [
            'payroll_slip_id' => $slipId,
            'decision' => 'validated',
        ]);
        $this->assertDatabaseCount('payroll_finance_assessments', 10);
    }

    public function test_manager_approval_rejects_a_slip_without_a_persisted_finance_assessment(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-NO-FINANCE-ASSESSMENT');
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-NO-FINANCE-ASSESSMENT', 'Validated', 0);
        DB::table('payroll_finance_assessment_batches')->where('payroll_slip_id', $slipId)->delete();
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('manual_assessments');
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'approval_status' => 'Pending Manager Approval']);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    public function test_stale_draft_submission_is_rejected_without_rewriting_saved_payroll_amounts(): void
    {
        $this->actAsPayrollPersonnel();
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-011');
        $creditId = $this->createCreditTransaction('BEN-TEST-011', 45.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-011', 'Draft', 10.00);

        $this->putJson("/api/payroll-slips/{$slipId}/submit", [])->assertUnprocessable();

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'validation_status' => 'Draft',
            'credit_deduction' => '10.00',
        ]);
        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '45.00']);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    public function test_rejects_finance_validation_when_outstanding_credit_no_longer_matches_the_slip(): void
    {
        $this->actAsFinanceOfficer();
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-005');
        $this->createCreditTransaction('BEN-TEST-005', 50.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-005', 'Submitted for Validation', 55.00);

        $this->putJson("/api/payroll-slips/{$slipId}/validate", ['manual_assessments' => $this->financeAssessments()])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The beneficiary credit balance changed after payroll preparation. Refresh or update the payroll so its full outstanding credit deduction matches the ledger before continuing.');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'validation_status' => 'Submitted for Validation',
        ]);
    }

    public function test_repeated_manager_approval_does_not_duplicate_credit_deductions(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-006');
        $creditId = $this->createCreditTransaction('BEN-TEST-006', 90.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-006', 'Validated', 90.00);
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertOk();
        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertUnprocessable();

        $this->assertDatabaseCount('credit_deductions', 1);
        $this->assertDatabaseHas('credit_deductions', [
            'credit_transaction_id' => $creditId,
            'payroll_slip_id' => $slipId,
            'amount' => '90.00',
        ]);
        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '0.00']);
    }

    public function test_rejects_credit_deduction_above_the_actual_balance_without_making_it_negative(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-007');
        $creditId = $this->createCreditTransaction('BEN-TEST-007', 25.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-007', 'Validated', 30.00);
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertUnprocessable();

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '25.00']);
        $this->assertDatabaseCount('credit_deductions', 0);
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'approval_status' => 'Pending Manager Approval']);
    }

    public function test_rolls_back_credit_posting_when_the_payroll_approval_update_fails(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-008');
        $creditId = $this->createCreditTransaction('BEN-TEST-008', 44.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-008', 'Validated', 44.00);
        $this->actAsManager();

        DB::unprepared("CREATE TRIGGER fail_credit_payroll_approval BEFORE UPDATE ON payroll_slips WHEN NEW.approval_status = 'Approved' BEGIN SELECT RAISE(ABORT, 'forced approval failure'); END;");

        try {
            $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertServerError();
        } finally {
            DB::unprepared('DROP TRIGGER IF EXISTS fail_credit_payroll_approval');
        }

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '44.00']);
        $this->assertDatabaseCount('credit_deductions', 0);
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'approval_status' => 'Pending Manager Approval']);
    }

    public function test_rolls_back_credit_balance_update_when_ledger_posting_fails(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-009');
        $creditId = $this->createCreditTransaction('BEN-TEST-009', 72.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-009', 'Validated', 72.00);
        $this->actAsManager();

        DB::unprepared("CREATE TRIGGER fail_credit_deduction_insert BEFORE INSERT ON credit_deductions BEGIN SELECT RAISE(ABORT, 'forced ledger failure'); END;");

        try {
            $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertServerError();
        } finally {
            DB::unprepared('DROP TRIGGER IF EXISTS fail_credit_deduction_insert');
        }

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '72.00']);
        $this->assertDatabaseCount('credit_deductions', 0);
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'approval_status' => 'Pending Manager Approval']);
    }

    public function test_returned_payroll_does_not_deduct_credit(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-010');
        $creditId = $this->createCreditTransaction('BEN-TEST-010', 18.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-010', 'Returned for Correction', 18.00);
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertUnprocessable();

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '18.00']);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    public function test_manager_approval_only_deducts_credit_owned_by_the_payroll_beneficiary(): void
    {
        $payrollBeneficiaryId = $this->createBeneficiary('BEN-TEST-013');
        $payrollCreditId = $this->createCreditTransaction('BEN-TEST-013', 61.25);
        $otherCreditId = $this->createCreditTransaction('BEN-TEST-014', 48.75);
        $slipId = $this->createPayrollSlip($payrollBeneficiaryId, 'BP-CREDIT-013', 'Validated', 61.25);
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertOk();

        $this->assertDatabaseHas('credit_transactions', ['id' => $payrollCreditId, 'remaining_balance' => '0.00']);
        $this->assertDatabaseHas('credit_transactions', ['id' => $otherCreditId, 'remaining_balance' => '48.75']);
        $this->assertDatabaseHas('credit_deductions', [
            'credit_transaction_id' => $payrollCreditId,
            'payroll_slip_id' => $slipId,
            'amount' => '61.25',
        ]);
        $this->assertDatabaseMissing('credit_deductions', [
            'credit_transaction_id' => $otherCreditId,
            'payroll_slip_id' => $slipId,
        ]);
    }

    public function test_credit_issued_before_approval_makes_the_saved_payroll_deduction_stale(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-015');
        $existingCreditId = $this->createCreditTransaction('BEN-TEST-015', 50.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-015', 'Validated', 50.00);
        $itemId = $this->createInventoryItem('ITEM-015', 10, 10.00);
        $this->actAsBookkeeper();

        $this->postJson("/api/inventory-items/{$itemId}/release", $this->creditReleasePayload('REL-CREDIT-015', $beneficiaryId))
            ->assertOk();

        $this->actAsManager();
        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The beneficiary credit balance changed after payroll preparation. Refresh or update the payroll so its full outstanding credit deduction matches the ledger before continuing.');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'validation_status' => 'Validated',
            'approval_status' => 'Pending Manager Approval',
            'credit_deduction' => '50.00',
            'net_amount' => '50.00',
        ]);
        $this->assertDatabaseHas('credit_transactions', ['id' => $existingCreditId, 'remaining_balance' => '50.00']);
        $this->assertDatabaseHas('credit_transactions', [
            'beneficiary_account_id' => 'BEN-TEST-015',
            'remaining_balance' => '20.00',
        ]);
        $this->assertDatabaseCount('credit_deductions', 0);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => '8.00']);
    }

    public function test_credit_issued_after_approval_remains_outstanding_and_does_not_change_the_approved_payroll(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-016');
        $existingCreditId = $this->createCreditTransaction('BEN-TEST-016', 50.00);
        $slipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-016', 'Validated', 50.00);
        $itemId = $this->createInventoryItem('ITEM-016', 10, 10.00);
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertOk();

        $this->actAsBookkeeper();
        $this->postJson("/api/inventory-items/{$itemId}/release", $this->creditReleasePayload('REL-CREDIT-016', $beneficiaryId))
            ->assertOk();

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'approval_status' => 'Approved',
            'credit_deduction' => '50.00',
            'total_deductions' => '50.00',
            'net_amount' => '50.00',
        ]);
        $this->assertDatabaseHas('credit_transactions', ['id' => $existingCreditId, 'remaining_balance' => '0.00']);
        $this->assertDatabaseHas('credit_transactions', [
            'beneficiary_account_id' => 'BEN-TEST-016',
            'remaining_balance' => '20.00',
        ]);
        $this->assertDatabaseCount('credit_deductions', 1);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => '8.00']);
    }

    public function test_two_payroll_slips_cannot_deduct_the_same_outstanding_credit_twice(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-017');
        $creditId = $this->createCreditTransaction('BEN-TEST-017', 33.00);
        $firstSlipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-017-A', 'Validated', 33.00);
        $secondSlipId = $this->createPayrollSlip($beneficiaryId, 'BP-CREDIT-017-B', 'Validated', 33.00);
        $this->actAsManager();

        $this->putJson("/api/payroll-slips/{$firstSlipId}/manager-approve", [])->assertOk();
        $this->putJson("/api/payroll-slips/{$secondSlipId}/manager-approve", [])->assertUnprocessable();

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '0.00']);
        $this->assertDatabaseCount('credit_deductions', 1);
        $this->assertDatabaseHas('credit_deductions', [
            'credit_transaction_id' => $creditId,
            'payroll_slip_id' => $firstSlipId,
            'amount' => '33.00',
        ]);
        $this->assertDatabaseHas('payroll_slips', ['id' => $secondSlipId, 'approval_status' => 'Pending Manager Approval']);
    }

    public function test_credit_release_uses_the_registered_beneficiary_and_rejects_reference_retries(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-018');
        $itemId = $this->createInventoryItem('ITEM-018', 10, 10.00);
        $this->actAsBookkeeper();
        $payload = $this->creditReleasePayload('REL-CREDIT-018', $beneficiaryId);
        $payload['beneficiary_account_id'] = 'FORGED-BENEFICIARY-CODE';
        $payload['beneficiary'] = 'Forged Beneficiary Name';

        $this->postJson("/api/inventory-items/{$itemId}/release", $payload)->assertOk();
        $this->postJson("/api/inventory-items/{$itemId}/release", $payload)
            ->assertConflict()
            ->assertJsonPath('message', 'This release reference has already been used.');

        $this->assertDatabaseCount('credit_transactions', 1);
        $this->assertDatabaseHas('credit_transactions', [
            'beneficiary_account_id' => 'BEN-TEST-018',
            'beneficiary_name' => 'Test Beneficiary',
            'remaining_balance' => '20.00',
        ]);
        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => '8.00']);
        $this->assertDatabaseCount('inventory_transactions', 1);
    }

    public function test_failed_credit_release_rolls_back_inventory_and_credit_records_together(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-TEST-019');
        $itemId = $this->createInventoryItem('ITEM-019', 10, 10.00);
        $this->actAsBookkeeper();

        DB::unprepared("CREATE TRIGGER fail_credit_issue BEFORE INSERT ON credit_transactions BEGIN SELECT RAISE(ABORT, 'forced credit issue failure'); END;");

        try {
            $this->postJson("/api/inventory-items/{$itemId}/release", $this->creditReleasePayload('REL-CREDIT-019', $beneficiaryId))
                ->assertServerError();
        } finally {
            DB::unprepared('DROP TRIGGER IF EXISTS fail_credit_issue');
        }

        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => '10.00']);
        $this->assertDatabaseCount('inventory_transactions', 0);
        $this->assertDatabaseCount('credit_transactions', 0);
    }

    public function test_credit_release_requires_an_active_registered_beneficiary_id(): void
    {
        $itemId = $this->createInventoryItem('ITEM-020', 10, 10.00);
        $this->actAsBookkeeper();
        $payload = $this->creditReleasePayload('REL-CREDIT-020', null);

        $this->postJson("/api/inventory-items/{$itemId}/release", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('beneficiary_id');
        $payload['beneficiary_id'] = 999999;
        $this->postJson("/api/inventory-items/{$itemId}/release", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('beneficiary_id');

        $this->assertDatabaseHas('inventory_items', ['id' => $itemId, 'on_hand' => '10.00']);
        $this->assertDatabaseCount('inventory_transactions', 0);
        $this->assertDatabaseCount('credit_transactions', 0);
    }

    public function test_direct_partial_credit_deduction_is_rejected(): void
    {
        $creditId = $this->createCreditTransaction('BEN-TEST-012', 25.00);
        $this->actAsManager();

        $this->postJson("/api/credit-transactions/{$creditId}/deduct", [
            'amount' => 1.00,
            'payroll_batch' => 'PB-TEST',
        ])->assertConflict()
            ->assertJsonPath('message', 'Credit deductions are posted only when a Manager/Admin approves the corresponding payroll slip.');

        $this->assertDatabaseHas('credit_transactions', ['id' => $creditId, 'remaining_balance' => '25.00']);
        $this->assertDatabaseCount('credit_deductions', 0);
    }

    private function createBeneficiary(string $code): int
    {
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $activeColumn = Schema::hasColumn('beneficiaries', 'is_active') ? 'is_active' : 'active';
        $values = [
            $codeColumn => $code,
            $nameColumn => 'Test Beneficiary',
            $activeColumn => true,
            'created_at' => now(),
        ];

        return DB::table('beneficiaries')->insertGetId($values);
    }

    private function actAsManager(): User
    {
        $manager = User::factory()->create([
            'role' => 'manager_admin',
            'active' => true,
        ]);

        $this->actingAs($manager, 'web');

        return $manager;
    }

    private function actAsPayrollPersonnel(): User
    {
        $user = User::factory()->create([
            'role' => 'payroll_personnel',
            'active' => true,
        ]);

        $this->actingAs($user, 'web');

        return $user;
    }

    private function actAsFinanceOfficer(): User
    {
        $user = User::factory()->create([
            'role' => 'finance_officer',
            'active' => true,
        ]);

        $this->actingAs($user, 'web');

        return $user;
    }

    private function createCreditTransaction(string $beneficiaryCode, float $balance): int
    {
        return DB::table('credit_transactions')->insertGetId([
            'credit_no' => 'CR-'.$beneficiaryCode.'-'.(DB::table('credit_transactions')->count() + 1),
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

    private function createInventoryItem(string $itemCode, float $onHand, float $unitCost): int
    {
        return DB::table('inventory_items')->insertGetId([
            'item_code' => $itemCode,
            'name' => 'Test material',
            'category' => 'Farm Materials',
            'unit' => 'kg',
            'on_hand' => $onHand,
            'minimum_stock' => 1,
            'unit_cost' => $unitCost,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function creditReleasePayload(string $referenceNo, ?int $beneficiaryId): array
    {
        return [
            'quantity' => 2,
            'unit_cost' => 10,
            'reference_no' => $referenceNo,
            'stock_date' => '2026-11-19',
            'release_type' => 'credit',
            'beneficiary_id' => $beneficiaryId,
            'beneficiary' => 'Test Beneficiary',
            'beneficiary_account_id' => 'BEN-TEST',
        ];
    }

    private function actAsBookkeeper(): User
    {
        $user = User::factory()->create([
            'role' => 'inventory_bookkeeper',
            'active' => true,
        ]);

        $this->actingAs($user, 'web');

        return $user;
    }

    private function createPayrollSlip(int $beneficiaryId, string $slipNo, string $validationStatus, float $creditDeduction): int
    {
        $productionId = DB::table('production_box_records')
            ->where('beneficiary_id', $beneficiaryId)
            ->whereBetween('production_date', ['2026-11-16', '2026-11-30'])
            ->value('id');
        if (! $productionId) {
            $productionId = $this->createProductionRecord($beneficiaryId);
        }
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
            'validation_status' => $validationStatus,
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

        if ($validationStatus === 'Validated') {
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
        }

        return $payrollSlipId;
    }

    private function financeAssessments(): array
    {
        return array_map(static fn (string $key): array => ['key' => $key, 'result' => 'Matched'], [
            'beneficiary', 'production', 'classification', 'prices', 'gross', 'credits', 'labor', 'other', 'deductions', 'net',
        ]);
    }

    private function createProductionRecord(int $beneficiaryId): int
    {
        return DB::table('production_box_records')->insertGetId([
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
    }
}
