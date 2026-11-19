<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PayrollDashboardStatisticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_statistics_are_zero_when_no_payroll_slips_exist(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'payroll_personnel', 'active' => true]), 'web');

        $this->getJson('/api/payroll-slips/statistics')
            ->assertOk()
            ->assertJsonPath('pending', 0)
            ->assertJsonPath('for_validation', 0)
            ->assertJsonPath('approved', 0);
    }

    public function test_statistics_count_only_records_in_the_matching_workflow_state(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'payroll_personnel', 'active' => true]), 'web');

        DB::table('payroll_slips')->insert([
            [
                'slip_no' => 'BP-DRAFT',
                'beneficiary_name' => 'Draft Beneficiary',
                'payroll_period' => 'June 1-15, 2026',
                'validation_status' => 'Draft',
                'approval_status' => 'Pending Approval',
            ],
            [
                'slip_no' => 'BP-SUBMITTED',
                'beneficiary_name' => 'Submitted Beneficiary',
                'payroll_period' => 'June 1-15, 2026',
                'validation_status' => 'Submitted for Validation',
                'approval_status' => 'Pending Approval',
            ],
            [
                'slip_no' => 'BP-UNDER-REVIEW',
                'beneficiary_name' => 'Under Review Beneficiary',
                'payroll_period' => 'June 1-15, 2026',
                'validation_status' => 'Validated',
                'approval_status' => 'Pending Manager Approval',
            ],
            [
                'slip_no' => 'BP-RETURNED',
                'beneficiary_name' => 'Returned Beneficiary',
                'payroll_period' => 'June 1-15, 2026',
                'validation_status' => 'Returned for Correction',
                'approval_status' => 'Pending Approval',
            ],
            [
                'slip_no' => 'BP-APPROVED',
                'beneficiary_name' => 'Approved Beneficiary',
                'payroll_period' => 'June 1-15, 2026',
                'validation_status' => 'Validated',
                'approval_status' => 'Approved',
            ],
        ]);

        $this->getJson('/api/payroll-slips/statistics')
            ->assertOk()
            ->assertJsonPath('pending', 1)
            ->assertJsonPath('for_validation', 1)
            ->assertJsonPath('approved', 1);

    }
}
