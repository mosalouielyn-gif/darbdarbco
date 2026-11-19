<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PayrollAppDataVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_drafts_are_available_to_payroll_personnel_but_excluded_from_finance_app_data(): void
    {
        $draftId = $this->createPayrollSlip('BP-DRAFT', 'Draft');
        $submittedId = $this->createPayrollSlip('BP-SUBMITTED', 'Submitted for Validation');
        $returnedId = $this->createPayrollSlip('BP-RETURNED', 'Returned for Correction');
        $validatedId = $this->createPayrollSlip('BP-VALIDATED', 'Validated', 'Pending Manager Approval');
        $approvedId = $this->createPayrollSlip('BP-APPROVED', 'Validated', 'Approved');

        $payrollUser = User::factory()->create(['role' => 'payroll_personnel', 'active' => true]);
        $this->actingAs($payrollUser, 'web');

        $this->getJson('/api/app-data?role=payroll_personnel')
            ->assertOk()
            ->assertJsonFragment(['id' => $draftId, 'validation_status' => 'Draft']);

        $financeUser = User::factory()->create(['role' => 'finance_officer', 'active' => true]);
        $this->actingAs($financeUser, 'web');

        $this->getJson('/api/app-data?role=finance_officer')
            ->assertOk()
            ->assertJsonMissing(['id' => $draftId, 'validation_status' => 'Draft'])
            ->assertJsonFragment(['id' => $submittedId, 'validation_status' => 'Submitted for Validation'])
            ->assertJsonFragment(['id' => $returnedId, 'validation_status' => 'Returned for Correction'])
            ->assertJsonFragment(['id' => $validatedId, 'validation_status' => 'Validated'])
            ->assertJsonFragment(['id' => $approvedId, 'approval_status' => 'Approved']);
    }

    public function test_only_submitted_payroll_can_be_validated_and_returned_payroll_must_be_resubmitted(): void
    {
        $user = User::factory()->create();
        $draftId = $this->createPayrollSlip('BP-DRAFT', 'Draft');
        $submittedId = $this->createPayrollSlip('BP-SUBMITTED', 'Submitted for Validation');
        $returnedId = $this->createPayrollSlip('BP-RETURNED', 'Returned for Correction');

        $financeUser = User::factory()->create(['role' => 'finance_officer', 'active' => true]);
        $this->actingAs($financeUser, 'web');

        $this->putJson("/api/payroll-slips/{$draftId}/validate", [
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])->assertUnprocessable();

        $this->putJson("/api/payroll-slips/{$returnedId}/validate", [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'manual_assessments' => $this->financeAssessments(),
        ])->assertUnprocessable();

        $payrollUser = User::factory()->create(['role' => 'payroll_personnel', 'active' => true]);
        $this->actingAs($payrollUser, 'web');

        $this->putJson("/api/payroll-slips/{$returnedId}/submit", [
            'user_id' => $user->id,
            'user_name' => $user->name,
        ])->assertOk()->assertJsonPath('validation_status', 'Submitted for Validation');

        $this->actingAs($financeUser, 'web');
        $financeSlips = $this->getJson('/api/app-data?role=finance_officer')
            ->assertOk()
            ->json('payrollSlips');

        $this->assertSame(
            ['BP-RETURNED', 'BP-SUBMITTED'],
            collect($financeSlips)->pluck('slip_no')->all(),
        );

        $this->putJson("/api/payroll-slips/{$submittedId}/validate", [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'manual_assessments' => $this->financeAssessments(),
        ])->assertOk()->assertJsonPath('validation_status', 'Validated');

        $this->assertDatabaseHas('payroll_slips', [
            'id' => $draftId,
            'validation_status' => 'Draft',
        ]);
        $this->assertDatabaseHas('payroll_slips', [
            'id' => $returnedId,
            'validation_status' => 'Submitted for Validation',
        ]);
        $this->assertDatabaseHas('payroll_slips', [
            'id' => $submittedId,
            'validation_status' => 'Validated',
        ]);
    }

    private function createPayrollSlip(string $slipNumber, string $validationStatus, string $approvalStatus = 'Pending Approval'): int
    {
        $beneficiaryCode = 'BEN-'.str_replace('-', '', $slipNumber);
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $activeColumn = Schema::hasColumn('beneficiaries', 'is_active') ? 'is_active' : 'active';
        $beneficiaryId = DB::table('beneficiaries')->insertGetId([
            $codeColumn => $beneficiaryCode,
            $nameColumn => "{$slipNumber} Beneficiary",
            $activeColumn => true,
            'created_at' => now(),
        ]);
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
            'slip_no' => $slipNumber,
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_code' => $beneficiaryCode,
            'beneficiary_name' => "{$slipNumber} Beneficiary",
            'payroll_period' => 'November 16-30, 2026',
            'production_box_record_id' => $productionId,
            'class_a_boxes' => 1,
            'class_b_boxes' => 0,
            'special_boxes' => 0,
            'class_a_price' => 100,
            'class_b_price' => 0,
            'special_price' => 0,
            'gross_amount' => 100,
            'credit_deduction' => 0,
            'material_deduction' => 0,
            'previous_balance' => 0,
            'labor_cost' => 0,
            'other_deductions' => 0,
            'total_deductions' => 0,
            'net_amount' => 100,
            'validation_status' => $validationStatus,
            'approval_status' => $approvalStatus,
        ]);

        DB::table('payroll_slip_production_sources')->insert([
            'payroll_slip_id' => $payrollSlipId,
            'source_table' => 'production_box_records',
            'source_record_id' => $productionId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $payrollSlipId;
    }

    private function financeAssessments(): array
    {
        return array_map(static fn (string $key): array => ['key' => $key, 'result' => 'Matched'], [
            'beneficiary', 'production', 'classification', 'prices', 'gross', 'credits', 'labor', 'other', 'deductions', 'net',
        ]);
    }
}
