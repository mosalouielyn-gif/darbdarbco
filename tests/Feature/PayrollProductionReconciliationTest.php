<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PayrollProductionReconciliationTest extends TestCase
{
    use RefreshDatabase;

    public function test_similar_beneficiary_names_cannot_use_each_others_production_records(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-SOURCE-001', 'Rowena C. Mendoza');
        $similarBeneficiaryId = $this->createBeneficiary('BEN-SOURCE-002', 'Mendoza, Rowena C.');
        $otherProductionId = $this->createProductionRecord($similarBeneficiaryId, ['class_a_big_hands' => 4]);
        $this->actAsPayrollPersonnel();

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $otherProductionId]],
        ))->assertUnprocessable()->assertJsonValidationErrors('production_sources.0');

        $this->assertDatabaseCount('payroll_slips', 0);
        $this->assertDatabaseCount('payroll_slip_production_sources', 0);
    }

    public function test_multiple_source_records_use_three_rates_and_full_credit_deduction(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-SOURCE-003', 'Registered Beneficiary');
        $firstProductionId = $this->createProductionRecord($beneficiaryId, [
            'class_a_big_hands' => 1,
            'class_a_small_hands' => 1,
            'class_b_big_hands' => 1,
            'special_product' => 1,
        ]);
        $secondProductionId = $this->createProductionRecord($beneficiaryId, [
            'class_a_big_hands' => 0,
            'class_a_cps' => 3,
            'class_b_small_hands' => 2,
            'special_product' => 2,
        ]);
        $this->createCreditTransaction('BEN-SOURCE-003', 40.00);
        $this->createCreditTransaction('BEN-SOURCE-003', 15.00);
        $this->actAsPayrollPersonnel();

        $response = $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [
                ['source_table' => 'production_box_records', 'id' => $firstProductionId],
                ['source_table' => 'production_box_records', 'id' => $secondProductionId],
            ],
            [
                'class_a_boxes' => 5,
                'class_b_boxes' => 3,
                'special_boxes' => 3,
                'class_a_price' => 100,
                'class_b_price' => 50,
                'special_price' => 25,
                'gross_amount' => 725,
                'credit_deduction' => 55,
                'material_deduction' => 55,
                'labor_cost' => 20,
                'other_deductions' => 10,
                'other_deduction_items' => [['type' => 'Authorized deduction', 'amount' => 10]],
                'total_deductions' => 85,
                'net_amount' => 640,
            ],
        ))->assertCreated()
            ->assertJsonPath('beneficiary_id', $beneficiaryId)
            ->assertJsonPath('class_a_boxes', 5)
            ->assertJsonPath('class_b_boxes', 3)
            ->assertJsonPath('special_boxes', 3)
            ->assertJsonPath('gross_amount', 725)
            ->assertJsonPath('credit_deduction', 55)
            ->assertJsonPath('total_deductions', 85)
            ->assertJsonPath('net_amount', 640)
            ->assertJsonCount(2, 'production_sources');

        $payrollSlipId = (int) $response->json('id');
        $this->assertDatabaseHas('payroll_slips', [
            'id' => $payrollSlipId,
            'beneficiary_id' => $beneficiaryId,
            'class_a_boxes' => 5,
            'class_b_boxes' => 3,
            'special_boxes' => 3,
        ]);
        $savedSlip = DB::table('payroll_slips')->where('id', $payrollSlipId)->first();
        $this->assertEquals(100.0, (float) $savedSlip->class_a_price);
        $this->assertEquals(50.0, (float) $savedSlip->class_b_price);
        $this->assertEquals(25.0, (float) $savedSlip->special_price);
        $this->assertEquals(725.0, (float) $savedSlip->gross_amount);
        $this->assertEquals(55.0, (float) $savedSlip->credit_deduction);
        $this->assertEquals(20.0, (float) $savedSlip->labor_cost);
        $this->assertEquals(10.0, (float) $savedSlip->other_deductions);
        $this->assertEquals(85.0, (float) $savedSlip->total_deductions);
        $this->assertEquals(640.0, (float) $savedSlip->net_amount);
        $this->assertDatabaseCount('payroll_slip_production_sources', 2);
        $this->assertDatabaseCount('credit_deductions', 0);

        $this->getJson('/api/app-data')
            ->assertOk()
            ->assertJsonPath('payrollSlips.0.gross_amount', 725)
            ->assertJsonCount(2, 'payrollSlips.0.production_sources')
            ->assertJsonPath('payrollSlips.0.production_reconciliation.status', 'matched')
            ->assertJsonPath('payrollSlips.0.production_reconciliation.source_quantities.class_a_boxes', 5)
            ->assertJsonPath('payrollSlips.0.production_reconciliation.source_quantities.class_b_boxes', 3)
            ->assertJsonPath('payrollSlips.0.production_reconciliation.source_quantities.special_boxes', 3)
            ->assertJsonCount(2, 'payrollSlips.0.production_reconciliation.source_records')
            ->assertJsonPath('payrollSlips.0.production_reconciliation.financial.calculated_gross_amount', '725.00')
            ->assertJsonPath('payrollSlips.0.production_reconciliation.financial.status', 'matched');
    }

    public function test_production_record_source_table_is_supported(): void
    {
        Schema::create('production_records', function ($table): void {
            $table->id();
            $table->string('record_no')->nullable();
            $table->foreignId('beneficiary_id');
            $table->date('harvest_date')->nullable();
            $table->date('packing_date')->nullable();
            $table->unsignedInteger('class_a_big_hands')->default(0);
            $table->unsignedInteger('class_a_small_hands')->default(0);
            $table->unsignedInteger('class_a_cps')->default(0);
            $table->unsignedInteger('class_b_big_hands')->default(0);
            $table->unsignedInteger('class_b_small_hands')->default(0);
            $table->unsignedInteger('class_b_cps')->default(0);
            $table->unsignedInteger('special_total')->default(0);
            $table->timestamps();
        });

        try {
            $beneficiaryId = $this->createBeneficiary('BEN-SOURCE-004', 'Legacy production beneficiary');
            $productionId = DB::table('production_records')->insertGetId([
                'record_no' => 'PR-TEST-001',
                'beneficiary_id' => $beneficiaryId,
                'harvest_date' => '2026-11-19',
                'packing_date' => '2026-11-20',
                'class_a_big_hands' => 2,
                'class_a_small_hands' => 1,
                'class_b_cps' => 3,
                'special_total' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->actAsPayrollPersonnel();

            $this->postJson('/api/payroll-slips', $this->payrollPayload(
                $beneficiaryId,
                [['source_table' => 'production_records', 'id' => $productionId]],
                [
                    'class_a_boxes' => 3,
                    'class_b_boxes' => 3,
                    'special_boxes' => 4,
                    'class_a_price' => 10,
                    'class_b_price' => 20,
                    'special_price' => 30,
                    'gross_amount' => 210,
                    'net_amount' => 210,
                ],
            ))->assertCreated()
                ->assertJsonPath('class_a_boxes', 3)
                ->assertJsonPath('class_b_boxes', 3)
                ->assertJsonPath('special_boxes', 4)
                ->assertJsonPath('gross_amount', 210)
                ->assertJsonPath('production_sources.0.source_table', 'production_records')
                ->assertJsonPath('production_sources.0.id', $productionId);
        } finally {
            Schema::dropIfExists('production_records');
        }
    }

    public function test_period_and_forged_quantities_or_financial_totals_are_rejected(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-SOURCE-005', 'Period beneficiary');
        $outsideProductionId = $this->createProductionRecord($beneficiaryId, [
            'production_date' => '2026-11-15',
            'class_a_big_hands' => 1,
        ]);
        $validProductionId = $this->createProductionRecord($beneficiaryId, ['class_a_big_hands' => 1]);
        $this->actAsPayrollPersonnel();

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $outsideProductionId]],
        ))->assertUnprocessable()->assertJsonValidationErrors('production_sources.0');

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => 999999]],
        ))->assertUnprocessable()->assertJsonValidationErrors('production_sources.0');

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $validProductionId]],
            ['class_a_boxes' => 9],
        ))->assertUnprocessable()->assertJsonValidationErrors('class_a_boxes');

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $validProductionId]],
            ['gross_amount' => 999],
        ))->assertUnprocessable()->assertJsonValidationErrors('gross_amount');

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $validProductionId]],
            ['total_deductions' => 1],
        ))->assertUnprocessable()->assertJsonValidationErrors('total_deductions');

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $validProductionId]],
            ['net_amount' => 99],
        ))->assertUnprocessable()->assertJsonValidationErrors('net_amount');

        $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $validProductionId]],
            ['credit_deduction' => 1, 'material_deduction' => 1, 'total_deductions' => 1, 'net_amount' => 99],
        ))->assertUnprocessable()->assertJsonValidationErrors('credit_deduction');

        $this->assertDatabaseCount('payroll_slips', 0);
    }

    public function test_finance_cannot_validate_when_a_linked_source_belongs_to_another_beneficiary(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-SOURCE-FINANCE-001', 'Payroll Beneficiary');
        $otherBeneficiaryId = $this->createBeneficiary('BEN-SOURCE-FINANCE-002', 'Other Beneficiary');
        $validProductionId = $this->createProductionRecord($beneficiaryId);
        $otherProductionId = $this->createProductionRecord($otherBeneficiaryId);
        $this->actAsPayrollPersonnel();

        $slipId = (int) $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $validProductionId]],
        ))->assertCreated()->json('id');
        DB::table('payroll_slips')->where('id', $slipId)->update(['validation_status' => 'Submitted for Validation']);
        DB::table('payroll_slip_production_sources')->where('payroll_slip_id', $slipId)->update(['source_record_id' => $otherProductionId]);

        $this->actAsFinanceOfficer();
        $this->putJson("/api/payroll-slips/{$slipId}/validate", ['manual_assessments' => $this->financeAssessments()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('production_sources.0');
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'validation_status' => 'Submitted for Validation']);
    }

    public function test_finance_cannot_validate_a_historical_slip_with_missing_source_references(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-SOURCE-FINANCE-003', 'Historical Beneficiary');
        $productionId = $this->createProductionRecord($beneficiaryId);
        $this->actAsPayrollPersonnel();
        $slipId = (int) $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $productionId]],
        ))->assertCreated()->json('id');
        DB::table('payroll_slips')->where('id', $slipId)->update(['validation_status' => 'Submitted for Validation']);
        DB::table('payroll_slip_production_sources')->where('payroll_slip_id', $slipId)->delete();
        $legacyReferences = [];
        foreach (['production_record_id', 'production_box_record_id'] as $column) {
            if (Schema::hasColumn('payroll_slips', $column)) {
                $legacyReferences[$column] = null;
            }
        }
        DB::table('payroll_slips')->where('id', $slipId)->update($legacyReferences);

        $this->actAsFinanceOfficer();
        $this->putJson("/api/payroll-slips/{$slipId}/validate", ['manual_assessments' => $this->financeAssessments()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('production_sources');
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'validation_status' => 'Submitted for Validation']);
    }

    public function test_finance_rejects_forged_saved_financial_amounts(): void
    {
        $beneficiaryId = $this->createBeneficiary('BEN-SOURCE-FINANCE-004', 'Financial Check Beneficiary');
        $productionId = $this->createProductionRecord($beneficiaryId);
        $this->actAsPayrollPersonnel();
        $slipId = (int) $this->postJson('/api/payroll-slips', $this->payrollPayload(
            $beneficiaryId,
            [['source_table' => 'production_box_records', 'id' => $productionId]],
        ))->assertCreated()->json('id');
        DB::table('payroll_slips')->where('id', $slipId)->update([
            'validation_status' => 'Submitted for Validation',
            'gross_amount' => 999,
        ]);

        $this->actAsFinanceOfficer();
        $this->putJson("/api/payroll-slips/{$slipId}/validate", ['manual_assessments' => $this->financeAssessments()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('gross_amount');
        $this->assertDatabaseHas('payroll_slips', ['id' => $slipId, 'validation_status' => 'Submitted for Validation']);
    }

    private function payrollPayload(int $beneficiaryId, array $productionSources, array $overrides = []): array
    {
        $beneficiary = DB::table('beneficiaries')->where('id', $beneficiaryId)->first();
        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';

        return array_replace([
            'slip_no' => 'BP-RECON-'.strtoupper(bin2hex(random_bytes(4))),
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => $beneficiary->{$nameColumn},
            'beneficiary_code' => $beneficiary->{$codeColumn},
            'production_sources' => $productionSources,
            'payroll_period' => 'November 16-30, 2026',
            'class_a_boxes' => 1,
            'class_b_boxes' => 0,
            'special_boxes' => 0,
            'class_a_price' => 100,
            'class_b_price' => 0,
            'special_price' => 0,
            'material_deduction' => 0,
            'previous_balance' => 0,
            'labor_cost' => 0,
            'other_deductions' => 0,
            'other_deduction_items' => [],
            'gross_amount' => 100,
            'credit_deduction' => 0,
            'total_deductions' => 0,
            'net_amount' => 100,
            'validation_status' => 'Draft',
        ], $overrides);
    }

    private function createBeneficiary(string $code, string $name): int
    {
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $activeColumn = Schema::hasColumn('beneficiaries', 'is_active') ? 'is_active' : 'active';

        return DB::table('beneficiaries')->insertGetId([
            $codeColumn => $code,
            $nameColumn => $name,
            $activeColumn => true,
            'created_at' => now(),
        ]);
    }

    private function createProductionRecord(int $beneficiaryId, array $overrides = []): int
    {
        return DB::table('production_box_records')->insertGetId(array_replace([
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
        ], $overrides));
    }

    private function createCreditTransaction(string $beneficiaryCode, float $balance): int
    {
        return DB::table('credit_transactions')->insertGetId([
            'credit_no' => 'CR-'.$beneficiaryCode.'-'.strtoupper(bin2hex(random_bytes(3))),
            'beneficiary_name' => 'Registered Beneficiary',
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

    private function actAsPayrollPersonnel(): void
    {
        $user = User::factory()->create(['role' => 'payroll_personnel', 'active' => true]);
        $this->actingAs($user, 'web');
    }

    private function actAsFinanceOfficer(): void
    {
        $user = User::factory()->create(['role' => 'finance_officer', 'active' => true]);
        $this->actingAs($user, 'web');
    }

    private function financeAssessments(): array
    {
        return array_map(static fn (string $key): array => ['key' => $key, 'result' => 'Matched'], [
            'beneficiary', 'production', 'classification', 'prices', 'gross', 'credits', 'labor', 'other', 'deductions', 'net',
        ]);
    }
}
