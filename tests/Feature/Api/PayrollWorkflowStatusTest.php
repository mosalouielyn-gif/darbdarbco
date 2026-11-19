<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PayrollWorkflowStatusTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('privilegedStatuses')]
    public function test_payroll_personnel_cannot_create_a_slip_with_a_privileged_status(string $status): void
    {
        $this->actAs('payroll_personnel');

        $this->postJson('/api/payroll-slips', $this->payrollPayload($status))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('validation_status');

        $this->assertDatabaseCount('payroll_slips', 0);
    }

    public static function privilegedStatuses(): array
    {
        return [
            'validated' => ['Validated'],
            'approved' => ['Approved'],
            'arbitrary status' => ['Anything Else'],
        ];
    }

    public function test_new_payroll_must_be_created_as_a_draft_before_submission(): void
    {
        $this->actAs('payroll_personnel');

        $this->postJson('/api/payroll-slips', $this->payrollPayload('Submitted for Validation'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'New payroll slips must be saved as Draft before they can be submitted for validation.');

        $this->assertDatabaseCount('payroll_slips', 0);
    }

    public function test_forged_approval_status_is_ignored_when_a_draft_is_created_or_updated(): void
    {
        $this->actAs('payroll_personnel');
        $payload = $this->payrollPayload('Draft');
        $payload['approval_status'] = 'Approved';

        $created = $this->postJson('/api/payroll-slips', $payload)
            ->assertCreated()
            ->assertJsonPath('approval_status', 'Pending Approval');

        $updatedPayload = $this->payrollPayload('Draft');
        $updatedPayload['approval_status'] = 'Approved';
        $updated = $this->putJson('/api/payroll-slips/'.$created->json('id'), $updatedPayload)
            ->assertOk()
            ->assertJsonPath('validation_status', 'Draft')
            ->assertJsonPath('approval_status', 'Pending Approval');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $updated->json('id'),
            'validation_status' => 'Draft',
            'approval_status' => 'Pending Approval',
        ]);
    }

    public function test_payroll_personnel_cannot_change_a_draft_directly_to_validated_or_approved(): void
    {
        $this->actAs('payroll_personnel');
        $created = $this->postJson('/api/payroll-slips', $this->payrollPayload('Draft'))->assertCreated();
        $payload = $this->payrollPayload('Validated');
        $payload['approval_status'] = 'Approved';

        $this->putJson('/api/payroll-slips/'.$created->json('id'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('validation_status');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $created->json('id'),
            'validation_status' => 'Draft',
            'approval_status' => 'Pending Approval',
        ]);
    }

    public function test_already_submitted_payroll_cannot_be_submitted_twice(): void
    {
        $this->actAs('payroll_personnel');
        $created = $this->postJson('/api/payroll-slips', $this->payrollPayload('Draft'))->assertCreated();
        $slipId = (int) $created->json('id');

        $this->putJson("/api/payroll-slips/{$slipId}/submit", [])->assertOk();
        $this->putJson("/api/payroll-slips/{$slipId}/submit", [])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Only Draft or returned payroll slips can be submitted for validation.');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'validation_status' => 'Submitted for Validation',
        ]);
    }

    public function test_finance_cannot_return_a_draft_payroll_slip(): void
    {
        $slipId = $this->createPayrollSlip('Draft');
        $this->actAs('finance_officer');

        $this->putJson("/api/payroll-slips/{$slipId}/return", [
            'category' => 'Missing information',
            'reason' => 'Please correct the source information.',
            'manual_assessments' => $this->financeAssessments('beneficiary'),
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Only submitted payroll slips can be returned for correction.');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'validation_status' => 'Draft',
        ]);
    }

    public function test_returned_payroll_stays_returned_when_corrections_are_saved_and_can_be_resubmitted(): void
    {
        $this->actAs('payroll_personnel');
        $created = $this->postJson('/api/payroll-slips', $this->payrollPayload('Draft'))->assertCreated();
        $slipId = (int) $created->json('id');
        $this->putJson("/api/payroll-slips/{$slipId}/submit", [])->assertOk();

        $financeOfficer = User::factory()->create(['role' => 'finance_officer', 'active' => true]);
        $this->actingAs($financeOfficer, 'web');
        $this->putJson("/api/payroll-slips/{$slipId}/return", [
            'category' => 'Correction',
            'reason' => 'Review payroll details.',
            'manual_assessments' => $this->financeAssessments('production'),
        ])->assertOk()->assertJsonPath('validation_status', 'Returned for Correction');
        $this->assertDatabaseHas('payroll_finance_assessment_batches', [
            'payroll_slip_id' => $slipId,
            'decision' => 'returned',
        ]);
        $this->assertDatabaseHas('payroll_finance_assessments', [
            'assessment_key' => 'production',
            'result' => 'Not Matched',
        ]);

        $this->actAs('payroll_personnel');
        $returnedPayload = $this->payrollPayload('Draft', (int) $created->json('beneficiary_id'));
        $savedCorrection = $this->putJson("/api/payroll-slips/{$slipId}", $returnedPayload)
            ->assertOk()
            ->assertJsonPath('validation_status', 'Returned for Correction');

        $resubmittedPayload = $this->payrollPayload('Submitted for Validation', (int) $created->json('beneficiary_id'));
        $this->putJson("/api/payroll-slips/{$slipId}", $resubmittedPayload)
            ->assertOk()
            ->assertJsonPath('validation_status', 'Submitted for Validation');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $savedCorrection->json('id'),
            'validation_status' => 'Submitted for Validation',
            'approval_status' => 'Pending Approval',
        ]);
    }

    public function test_approved_payroll_is_immutable_after_the_authorized_workflow(): void
    {
        $payrollPersonnel = $this->actAs('payroll_personnel');
        $created = $this->postJson('/api/payroll-slips', $this->payrollPayload('Draft'))->assertCreated();
        $slipId = (int) $created->json('id');

        $this->putJson("/api/payroll-slips/{$slipId}/submit", [])->assertOk()
            ->assertJsonPath('validation_status', 'Submitted for Validation');

        $financeOfficer = User::factory()->create(['role' => 'finance_officer', 'active' => true]);
        $this->actingAs($financeOfficer, 'web');
        $this->putJson("/api/payroll-slips/{$slipId}/validate", ['manual_assessments' => $this->financeAssessments()])->assertOk()
            ->assertJsonPath('validation_status', 'Validated')
            ->assertJsonPath('approval_status', 'Pending Manager Approval');

        $manager = User::factory()->create(['role' => 'manager_admin', 'active' => true]);
        $this->actingAs($manager, 'web');
        $this->putJson("/api/payroll-slips/{$slipId}/manager-approve", [])->assertOk()
            ->assertJsonPath('approval_status', 'Approved');

        $updatePayload = $this->payrollPayload('Draft');
        $updatePayload['gross_amount'] = 500;
        $this->actingAs($payrollPersonnel, 'web');
        $this->putJson("/api/payroll-slips/{$slipId}", $updatePayload)->assertUnprocessable();

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $slipId,
            'validation_status' => 'Validated',
            'approval_status' => 'Approved',
            'gross_amount' => '100.00',
        ]);
    }

    private function payrollPayload(string $status, ?int $existingBeneficiaryId = null): array
    {
        $beneficiaryCode = 'BEN-WORKFLOW-'.strtoupper(bin2hex(random_bytes(3)));
        $beneficiaryId = $existingBeneficiaryId ?? $this->createBeneficiary($beneficiaryCode);
        if ($existingBeneficiaryId === null) {
            $this->createProductionRecord($beneficiaryId);
        }
        $productionIds = DB::table('production_box_records')
            ->where('beneficiary_id', $beneficiaryId)
            ->whereBetween('production_date', ['2026-11-16', '2026-11-30'])
            ->orderBy('id')
            ->pluck('id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();
        $classABoxes = count($productionIds);

        return [
            'slip_no' => 'BP-WORKFLOW-'.strtoupper(bin2hex(random_bytes(3))),
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Test Beneficiary',
            'beneficiary_code' => $existingBeneficiaryId === null
                ? $beneficiaryCode
                : DB::table('beneficiaries')->where('id', $beneficiaryId)->value(Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code'),
            'production_sources' => array_map(static fn (int $id): array => ['source_table' => 'production_box_records', 'id' => $id], $productionIds),
            'payroll_period' => 'November 16-30, 2026',
            'class_a_boxes' => $classABoxes,
            'class_b_boxes' => 0,
            'special_boxes' => 0,
            'class_a_price' => 100,
            'class_b_price' => 0,
            'special_price' => 0,
            'gross_amount' => 100 * $classABoxes,
            'credit_deduction' => 0,
            'total_deductions' => 0,
            'net_amount' => 100 * $classABoxes,
            'validation_status' => $status,
        ];
    }

    private function financeAssessments(?string $mismatchKey = null): array
    {
        return array_map(static fn (string $key): array => [
            'key' => $key,
            'result' => $key === $mismatchKey ? 'Not Matched' : 'Matched',
        ], ['beneficiary', 'production', 'classification', 'prices', 'gross', 'credits', 'labor', 'other', 'deductions', 'net']);
    }

    private function createPayrollSlip(string $status): int
    {
        $beneficiaryCode = 'BEN-WORKFLOW-'.strtoupper(bin2hex(random_bytes(3)));
        $beneficiaryId = $this->createBeneficiary($beneficiaryCode);

        return DB::table('payroll_slips')->insertGetId([
            'slip_no' => 'BP-WORKFLOW-FIXTURE-'.strtoupper(bin2hex(random_bytes(3))),
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Test Beneficiary',
            'beneficiary_code' => $beneficiaryCode,
            'payroll_period' => 'November 16-30, 2026',
            'gross_amount' => 100,
            'total_deductions' => 0,
            'net_amount' => 100,
            'validation_status' => $status,
            'approval_status' => 'Pending Approval',
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

    private function createProductionRecord(int $beneficiaryId): int
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

        return $productionId;
    }

    private function actAs(string $role): User
    {
        $user = User::factory()->create(['role' => $role, 'active' => true]);
        $this->actingAs($user, 'web');

        return $user;
    }
}
