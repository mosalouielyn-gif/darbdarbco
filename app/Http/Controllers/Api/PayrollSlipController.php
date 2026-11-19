<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PayrollSlipController extends Controller
{
    private const MIN_AUTHORIZED_DEDUCTION_AMOUNT = 1;

    private const FINANCE_ASSESSMENT_KEYS = [
        'beneficiary',
        'production',
        'classification',
        'prices',
        'gross',
        'credits',
        'labor',
        'other',
        'deductions',
        'net',
    ];

    public function statistics(): JsonResponse
    {
        if (! Schema::hasTable('payroll_slips')) {
            return response()->json([
                'pending' => 0,
                'for_validation' => 0,
                'approved' => 0,
            ]);
        }

        $statistics = DB::table('payroll_slips')
            ->selectRaw(
                'COUNT(CASE WHEN validation_status = ? THEN 1 END) AS pending, '
                .'COUNT(CASE WHEN validation_status = ? THEN 1 END) AS for_validation, '
                .'COUNT(CASE WHEN validation_status = ? AND approval_status = ? THEN 1 END) AS approved',
                ['Draft', 'Submitted for Validation', 'Validated', 'Approved'],
            )
            ->first();

        return response()->json([
            'pending' => (int) $statistics->pending,
            'for_validation' => (int) $statistics->for_validation,
            'approved' => (int) $statistics->approved,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $requestPayload = $this->validatedPayload($request);
        abort_if($requestPayload['validation_status'] !== 'Draft', 422, 'New payroll slips must be saved as Draft before they can be submitted for validation.');

        $record = DB::transaction(function () use ($requestPayload): object {
            $payload = $this->calculatePayrollPayload($requestPayload, lockProductionSources: true);
            $slipNo = $payload['slip_no'] ?? $this->nextSlipNo();
            $values = $this->values($payload, $slipNo);

            $id = DB::table('payroll_slips')->insertGetId($values);
            $this->syncOtherDeductions($id, $payload['other_deduction_items'] ?? []);
            $this->syncProductionSources($id, $payload['production_sources']);
            $createdRecord = $this->findSlip($id);

            $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Created', "Created payroll slip {$slipNo}");

            return $createdRecord;
        });

        return response()->json($record, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $requestPayload = $this->validatedPayload($request);
        $record = DB::transaction(function () use ($id, $requestPayload): object {
            $current = DB::table('payroll_slips')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Payroll slip not found.');

            $currentStatus = $current->validation_status ?? 'Draft';
            abort_if(($current->approval_status ?? '') === 'Approved', 422, 'Approved payroll slips cannot be edited.');
            abort_unless(in_array($currentStatus, ['Draft', 'Returned for Correction'], true), 422, 'Only Draft or returned payroll slips can be edited.');

            $payload = $this->calculatePayrollPayload($requestPayload, lockProductionSources: true);
            if ($currentStatus === 'Returned for Correction' && $payload['validation_status'] === 'Draft') {
                $payload['validation_status'] = 'Returned for Correction';
            }

            DB::table('payroll_slips')->where('id', $id)->update($this->values($payload, $current->slip_no ?? null, $current));
            $this->syncOtherDeductions($id, $payload['other_deduction_items'] ?? []);
            $this->syncProductionSources($id, $payload['production_sources']);

            $updatedRecord = $this->findSlip($id);
            $isResubmission = $currentStatus === 'Returned for Correction'
                && $payload['validation_status'] === 'Submitted for Validation';
            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                $isResubmission ? 'Resubmitted' : 'Updated',
                $isResubmission
                    ? "Resubmitted corrected payroll slip {$updatedRecord->slip_no} for validation"
                    : "Updated payroll slip {$updatedRecord->slip_no}"
            );

            return $updatedRecord;
        });

        return response()->json($record);
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $record = DB::transaction(function () use ($id, $payload): object {
            $current = DB::table('payroll_slips')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Payroll slip not found.');
            abort_if(($current->approval_status ?? '') === 'Approved', 422, 'Approved payroll slips cannot be submitted again.');
            abort_unless(in_array($current->validation_status ?? 'Draft', ['Draft', 'Returned for Correction'], true), 422, 'Only Draft or returned payroll slips can be submitted for validation.');

            $credits = $this->outstandingCreditTransactions((int) $current->beneficiary_id, lockForUpdate: true);
            $this->assertCreditDeductionMatches($current, $credits);
            $this->assertStoredProductionAndFinancialsMatch($current, $credits);

            $isResubmission = ($current->validation_status ?? '') === 'Returned for Correction';
            $values = [
                'validation_status' => 'Submitted for Validation',
                'approval_status' => 'Pending Approval',
                'submitted_at' => now(),
            ];
            $this->putIfColumn($values, 'validated_by', null);
            $this->putIfColumn($values, 'validated_at', null);
            $this->putIfColumn($values, 'approved_by', null);
            $this->putIfColumn($values, 'approved_at', null);

            if ($isResubmission) {
                $this->putIfColumn($values, 'resubmitted_at', now());
                $this->putIfColumn($values, 'resubmission_count', (int) ($current->resubmission_count ?? 0) + 1);
            }

            DB::table('payroll_slips')->where('id', $id)->update($values);
            $record = $this->findSlip($id);
            $this->recordAudit(
                $payload['user_id'] ?? null,
                $payload['user_name'] ?? null,
                $isResubmission ? 'Resubmitted' : 'Submitted',
                $isResubmission
                    ? "Resubmitted corrected payroll slip {$record->slip_no} for validation"
                    : "Payroll slip {$record->slip_no} submitted for validation"
            );

            return $record;
        });

        return response()->json($record);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $current = DB::table('payroll_slips')->where('id', $id)->first();
        abort_if(! $current, 404, 'Payroll slip not found.');
        abort_if(($current->validation_status ?? 'Draft') !== 'Draft', 422, 'Only draft payroll slips can be deleted.');

        DB::table('payroll_slips')->where('id', $id)->delete();
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Deleted', "Deleted payroll slip {$current->slip_no}");

        return response()->json(['ok' => true]);
    }

    public function validateSlip(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'manual_assessments' => ['required', 'array', 'size:'.count(self::FINANCE_ASSESSMENT_KEYS)],
            'manual_assessments.*.key' => ['required', 'string', Rule::in(self::FINANCE_ASSESSMENT_KEYS)],
            'manual_assessments.*.result' => ['required', Rule::in(['Matched', 'Not Matched'])],
            'remarks' => ['nullable', 'string'],
        ]);
        $assessments = $this->normalizeFinanceAssessments($payload['manual_assessments'], requireMismatch: false);
        $financeOfficer = $request->user();
        abort_unless($financeOfficer, 401, 'Authentication is required.');
        $financeOfficerId = (int) $financeOfficer->getAuthIdentifier();
        $financeOfficerName = $financeOfficer->getAttribute('full_name') ?? $financeOfficer->getAttribute('name');

        $record = DB::transaction(function () use ($id, $payload, $assessments, $financeOfficerId, $financeOfficerName): object {
            $current = DB::table('payroll_slips')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Payroll slip not found.');
            abort_if(($current->validation_status ?? '') !== 'Submitted for Validation', 422, 'Only payroll slips submitted for validation can be validated.');

            $credits = $this->outstandingCreditTransactions((int) $current->beneficiary_id, lockForUpdate: true);
            $this->assertCreditDeductionMatches($current, $credits);
            $this->assertStoredProductionAndFinancialsMatch($current, $credits);
            $this->storeFinanceAssessment($id, $assessments, $financeOfficerId, 'validated');

            DB::table('payroll_slips')->where('id', $id)->update([
                'validation_status' => 'Validated',
                'approval_status' => 'Pending Manager Approval',
                'validated_by' => $financeOfficerId,
                'validated_at' => now(),
            ]);

            $record = $this->findSlip($id);
            $this->recordAudit($financeOfficerId, $financeOfficerName, 'Validated', $payload['remarks'] ?? "Validated payroll slip {$record->slip_no}");

            return $record;
        });

        return response()->json($record);
    }

    public function returnForCorrection(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'category' => ['required', 'string', 'max:255'],
            'reason' => ['required', 'string'],
            'remarks' => ['nullable', 'string'],
            'manual_assessments' => ['required', 'array', 'size:'.count(self::FINANCE_ASSESSMENT_KEYS)],
            'manual_assessments.*.key' => ['required', 'string', Rule::in(self::FINANCE_ASSESSMENT_KEYS)],
            'manual_assessments.*.result' => ['required', Rule::in(['Matched', 'Not Matched'])],
        ]);
        $assessments = $this->normalizeFinanceAssessments($payload['manual_assessments'], requireMismatch: true);
        $financeOfficer = $request->user();
        abort_unless($financeOfficer, 401, 'Authentication is required.');
        $financeOfficerId = (int) $financeOfficer->getAuthIdentifier();
        $financeOfficerName = $financeOfficer->getAttribute('full_name') ?? $financeOfficer->getAttribute('name');

        $record = DB::transaction(function () use ($id, $payload, $assessments, $financeOfficerId, $financeOfficerName): object {
            $current = DB::table('payroll_slips')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Payroll slip not found.');
            abort_unless(($current->validation_status ?? '') === 'Submitted for Validation', 422, 'Only submitted payroll slips can be returned for correction.');
            abort_if(($current->approval_status ?? '') === 'Approved', 422, 'Approved payroll slips cannot be returned.');

            $this->storeFinanceAssessment($id, $assessments, $financeOfficerId, 'returned');
            $returnUserId = $financeOfficerId;
            $returnValues = [
                'validation_status' => 'Returned for Correction',
                'approval_status' => 'Pending Approval',
                'validated_by' => $returnUserId,
                'validated_at' => now(),
            ];

            $this->putIfColumn($returnValues, 'return_category', $payload['category']);
            $this->putIfColumn($returnValues, 'return_reason', $payload['reason']);
            $this->putIfColumn($returnValues, 'return_remarks', $payload['remarks'] ?? null);
            $this->putIfColumn($returnValues, 'returned_by', $returnUserId);
            $this->putIfColumn($returnValues, 'returned_at', now());

            DB::table('payroll_slips')->where('id', $id)->update($returnValues);

            $updatedRecord = $this->findSlip($id);
            $details = "{$payload['category']}: {$payload['reason']}";
            if (! empty($payload['remarks'])) {
                $details .= " Remarks: {$payload['remarks']}";
            }
            $this->recordAudit($financeOfficerId, $financeOfficerName, 'Returned', "Returned payroll slip {$updatedRecord->slip_no} - {$details}");

            return $updatedRecord;
        });

        return response()->json($record);
    }

    public function approveByManager(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'remarks' => ['nullable', 'string'],
        ]);
        $approver = $request->user();
        abort_unless($approver, 401, 'Authentication is required.');
        $approvedBy = (int) $approver->getAuthIdentifier();
        $approvedByName = $approver->getAttribute('full_name') ?? $approver->getAttribute('name');

        $record = DB::transaction(function () use ($id, $payload, $approvedBy, $approvedByName): object {
            $current = DB::table('payroll_slips')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Payroll slip not found.');
            abort_if(($current->validation_status ?? '') !== 'Validated', 422, 'Only Finance-validated payroll slips can be approved.');
            abort_if(($current->approval_status ?? '') === 'Approved', 422, 'Payroll slip is already approved.');
            abort_if(! Schema::hasColumn('credit_deductions', 'payroll_slip_id'), 503, 'Credit deduction tracking is not available. Apply the payroll credit ledger migration before approving payroll.');
            abort_if(DB::table('credit_deductions')->where('payroll_slip_id', $id)->exists(), 409, 'Credit deductions have already been posted for this payroll slip.');

            $credits = $this->outstandingCreditTransactions((int) $current->beneficiary_id, lockForUpdate: true);
            $this->assertCreditDeductionMatches($current, $credits);
            $this->assertStoredProductionAndFinancialsMatch($current, $credits);
            $this->assertLatestFinanceAssessmentMatched($id);

            $postedAt = now();
            $postedCents = 0;

            foreach ($credits as $credit) {
                $remainingCents = $this->moneyToCents($credit->remaining_balance);
                if ($remainingCents <= 0) {
                    continue;
                }

                $updated = DB::table('credit_transactions')
                    ->where('id', $credit->id)
                    ->where('remaining_balance', '>', 0)
                    ->update([
                        'remaining_balance' => '0.00',
                        'status' => 'Fully Deducted',
                        'updated_at' => $postedAt,
                    ]);
                abort_if($updated !== 1, 409, 'A beneficiary credit balance changed during approval. No payroll or credit changes were saved.');

                DB::table('credit_deductions')->insert([
                    'credit_transaction_id' => $credit->id,
                    'payroll_slip_id' => $id,
                    'payroll_batch' => (string) ($current->batch_id ?? $current->slip_no),
                    'amount' => $this->centsToMoney($remainingCents),
                    'deduction_date' => $postedAt->toDateString(),
                    'recorded_by_name' => $approvedByName,
                    'recorded_by' => $approvedBy,
                    'created_at' => $postedAt,
                    'updated_at' => $postedAt,
                ]);

                $postedCents += $remainingCents;
            }

            DB::table('payroll_slips')->where('id', $id)->update([
                'approval_status' => 'Approved',
                'approved_by' => $approvedBy,
                'approved_at' => $postedAt,
            ]);

            $record = $this->findSlip($id);
            $this->recordAudit($approvedBy, $approvedByName, 'Approved', $payload['remarks'] ?? "Approved payroll slip {$record->slip_no}");
            if ($postedCents > 0) {
                $this->recordAudit(
                    $approvedBy,
                    $approvedByName,
                    'Credit Deduction Posted',
                    "Posted {$this->centsToMoney($postedCents)} in full beneficiary credit deductions across {$credits->count()} credit transaction(s) for payroll slip {$record->slip_no}.",
                );
            }

            return $record;
        });

        return response()->json($record);
    }

    public function returnByManager(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'reason' => ['required', 'string'],
            'remarks' => ['nullable', 'string'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $current = DB::table('payroll_slips')->where('id', $id)->first();
        abort_if(! $current, 404, 'Payroll slip not found.');
        $record = DB::transaction(function () use ($id, $payload): object {
            $current = DB::table('payroll_slips')->where('id', $id)->lockForUpdate()->first();
            abort_if(! $current, 404, 'Payroll slip not found.');
            abort_unless(($current->validation_status ?? '') === 'Validated', 422, 'Only Finance-validated payroll slips can be returned by Manager.');
            abort_if(($current->approval_status ?? '') === 'Approved', 422, 'Approved payroll slips cannot be returned.');

            $returnUserId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
            $returnValues = [
                'validation_status' => 'Returned for Correction',
                'approval_status' => 'Pending Approval',
                'approved_by' => $returnUserId,
                'approved_at' => now(),
            ];

            $this->putIfColumn($returnValues, 'return_category', 'Manager Review');
            $this->putIfColumn($returnValues, 'return_reason', $payload['reason']);
            $this->putIfColumn($returnValues, 'return_remarks', $payload['remarks'] ?? null);
            $this->putIfColumn($returnValues, 'returned_by', $returnUserId);
            $this->putIfColumn($returnValues, 'returned_at', now());

            DB::table('payroll_slips')->where('id', $id)->update($returnValues);

            $updatedRecord = $this->findSlip($id);
            $details = $payload['reason'];
            if (! empty($payload['remarks'])) {
                $details .= " Remarks: {$payload['remarks']}";
            }
            $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Returned', "Manager returned payroll slip {$updatedRecord->slip_no} - {$details}");

            return $updatedRecord;
        });

        return response()->json($record);
    }

    private function calculatePayrollPayload(array $payload, bool $lockProductionSources = false): array
    {
        if (! Schema::hasTable('payroll_slip_production_sources')) {
            abort(503, 'Payroll production source tracking is unavailable. Apply the payroll production sources migration before preparing payroll.');
        }

        $production = $this->productionSourceSummary(
            (int) $payload['beneficiary_id'],
            $payload['payroll_period'],
            $payload['production_sources'],
            $lockProductionSources,
        );

        foreach ([
            'class_a_boxes' => $production['class_a_boxes'],
            'class_b_boxes' => $production['class_b_boxes'],
            'special_boxes' => $production['special_boxes'],
        ] as $field => $expected) {
            if (array_key_exists($field, $payload) && (int) $payload[$field] !== $expected) {
                $this->rejectPayrollMismatch($field, 'The submitted production quantity does not match the selected source records. Refresh the production details and try again.');
            }

            $payload[$field] = $expected;
        }

        $payload['production_sources'] = $production['references'];
        $payload['harvest_date'] = $production['harvest_date'];

        $grossCents = ($production['class_a_boxes'] * $this->moneyToCents($payload['class_a_price']))
            + ($production['class_b_boxes'] * $this->moneyToCents($payload['class_b_price']))
            + ($production['special_boxes'] * $this->moneyToCents($payload['special_price']));
        $grossAmount = $this->centsToMoney($grossCents);
        $this->assertClientMoneyMatches($payload, 'gross_amount', $grossAmount);

        $creditCents = $this->totalOutstandingCents($this->outstandingCreditTransactions((int) $payload['beneficiary_id'], lockForUpdate: $lockProductionSources));
        $creditAmount = $this->centsToMoney($creditCents);
        $this->assertClientMoneyMatches($payload, 'credit_deduction', $creditAmount);
        $this->assertClientMoneyMatches($payload, 'material_deduction', $creditAmount);

        $otherDeductionsCents = $this->moneyToCents($payload['other_deductions'] ?? 0);
        if (array_key_exists('other_deduction_items', $payload)) {
            $itemTotalCents = collect($payload['other_deduction_items'] ?? [])
                ->sum(fn (array $item): int => $this->moneyToCents($item['amount'] ?? 0));
            if (array_key_exists('other_deductions', $payload) && $otherDeductionsCents !== $itemTotalCents) {
                $this->rejectPayrollMismatch('other_deductions', 'The other deductions total does not match its itemized deductions.');
            }
            $otherDeductionsCents = $itemTotalCents;
        }

        $totalDeductionsCents = $creditCents
            + $this->moneyToCents($payload['previous_balance'] ?? 0)
            + $this->moneyToCents($payload['labor_cost'] ?? 0)
            + $otherDeductionsCents;
        $totalDeductions = $this->centsToMoney($totalDeductionsCents);
        $netAmount = $this->centsToMoney($grossCents - $totalDeductionsCents);
        $this->assertClientMoneyMatches($payload, 'total_deductions', $totalDeductions);
        $this->assertClientMoneyMatches($payload, 'net_amount', $netAmount);

        $payload['gross_amount'] = $grossAmount;
        $payload['credit_deduction'] = $creditAmount;
        $payload['material_deduction'] = $creditAmount;
        $payload['other_deductions'] = $this->centsToMoney($otherDeductionsCents);
        $payload['total_deductions'] = $totalDeductions;
        $payload['net_amount'] = $netAmount;

        return $payload;
    }

    /**
     * @param  array<int, array{source_table: string, id: int}>  $sources
     * @return array{references: array<int, array{source_table: string, source_record_id: int}>, class_a_boxes: int, class_b_boxes: int, special_boxes: int, harvest_date: string}
     */
    private function productionSourceSummary(int $beneficiaryId, string $payrollPeriod, array $sources, bool $lockForUpdate = false): array
    {
        $period = $this->payrollPeriodDateRange($payrollPeriod);
        if ($period === null) {
            $this->rejectPayrollMismatch('payroll_period', 'Use a valid payroll period such as November 16-30, 2026.');
        }

        $references = [];
        $seenSources = [];
        $classABoxes = 0;
        $classBBoxes = 0;
        $specialBoxes = 0;
        $dates = [];

        foreach ($sources as $index => $source) {
            $table = (string) ($source['source_table'] ?? '');
            $sourceId = (int) ($source['id'] ?? 0);
            $sourceKey = $table.':'.$sourceId;
            if (isset($seenSources[$sourceKey])) {
                $this->rejectPayrollMismatch("production_sources.{$index}", 'A production source record can only be included once.');
            }
            $seenSources[$sourceKey] = true;

            if (! in_array($table, ['production_records', 'production_box_records'], true)
                || ! Schema::hasTable($table)
                || ! Schema::hasColumn($table, 'beneficiary_id')) {
                $this->rejectPayrollMismatch("production_sources.{$index}", 'The selected production source is unavailable. Refresh the production details and try again.');
            }

            $query = DB::table($table)->where('id', $sourceId);
            if ($lockForUpdate) {
                $query->lockForUpdate();
            }
            $sourceRecord = $query->first();
            if (! $sourceRecord || (int) $sourceRecord->beneficiary_id !== $beneficiaryId) {
                $this->rejectPayrollMismatch("production_sources.{$index}", 'A selected production record does not belong to the registered payroll beneficiary.');
            }

            $date = $table === 'production_records'
                ? ($sourceRecord->harvest_date ?? $sourceRecord->packing_date ?? null)
                : ($sourceRecord->production_date ?? null);
            $date = $date === null ? '' : substr((string) $date, 0, 10);
            if ($date === '' || $date < $period['start'] || $date > $period['end']) {
                $this->rejectPayrollMismatch("production_sources.{$index}", 'A selected production record falls outside the selected payroll period.');
            }
            $dates[] = $date;

            $classABoxes += $this->productionQuantity($table, $sourceRecord, ['class_a_big_hands', 'class_a_big'])
                + $this->productionQuantity($table, $sourceRecord, ['class_a_small_hands', 'class_a_small'])
                + $this->productionQuantity($table, $sourceRecord, ['class_a_cps', 'class_a_cp']);
            $classBBoxes += $this->productionQuantity($table, $sourceRecord, ['class_b_big_hands', 'class_b_big'])
                + $this->productionQuantity($table, $sourceRecord, ['class_b_small_hands', 'class_b_small'])
                + $this->productionQuantity($table, $sourceRecord, ['class_b_cps', 'class_b_cp']);
            $specialBoxes += $this->productionQuantity($table, $sourceRecord, ['special_total', 'special_product']);

            $references[] = [
                'source_table' => $table,
                'source_record_id' => $sourceId,
            ];
        }

        if ($references === []) {
            $this->rejectPayrollMismatch('production_sources', 'Select at least one registered production record for this beneficiary and payroll period.');
        }

        $providedSourceKeys = array_map(
            static fn (array $reference): string => $reference['source_table'].':'.$reference['source_record_id'],
            $references,
        );
        $expectedSourceKeys = $this->productionSourceKeysForPeriod($beneficiaryId, $period);
        sort($providedSourceKeys);
        sort($expectedSourceKeys);
        if ($providedSourceKeys !== $expectedSourceKeys) {
            $this->rejectPayrollMismatch('production_sources', 'Production source references are incomplete for the selected beneficiary and payroll period. Refresh the source records before continuing.');
        }

        sort($dates);

        return [
            'references' => $references,
            'class_a_boxes' => $classABoxes,
            'class_b_boxes' => $classBBoxes,
            'special_boxes' => $specialBoxes,
            'harvest_date' => $dates[0],
        ];
    }

    /** @param array{start: string, end: string} $period
     *  @return array<int, string>
     */
    private function productionSourceKeysForPeriod(int $beneficiaryId, array $period): array
    {
        $sourceKeys = [];
        foreach (['production_records', 'production_box_records'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'beneficiary_id')) {
                continue;
            }

            $query = DB::table($table)->where('beneficiary_id', $beneficiaryId);
            if ($table === 'production_box_records' && Schema::hasColumn($table, 'production_date')) {
                $query->whereBetween('production_date', [$period['start'], $period['end']]);
            } else {
                $hasHarvestDate = Schema::hasColumn($table, 'harvest_date');
                $hasPackingDate = Schema::hasColumn($table, 'packing_date');
                if ($hasHarvestDate && $hasPackingDate) {
                    $query->where(function ($dateQuery) use ($period): void {
                        $dateQuery->whereBetween('harvest_date', [$period['start'], $period['end']])
                            ->orWhere(function ($packingQuery) use ($period): void {
                                $packingQuery->whereNull('harvest_date')
                                    ->whereBetween('packing_date', [$period['start'], $period['end']]);
                            });
                    });
                } elseif ($hasHarvestDate) {
                    $query->whereBetween('harvest_date', [$period['start'], $period['end']]);
                } elseif ($hasPackingDate) {
                    $query->whereBetween('packing_date', [$period['start'], $period['end']]);
                } else {
                    continue;
                }
            }

            foreach ($query->get(['id']) as $record) {
                $sourceKeys[] = $table.':'.(int) $record->id;
            }
        }

        return $sourceKeys;
    }

    private function productionQuantity(string $table, object $record, array $candidateColumns): int
    {
        foreach ($candidateColumns as $column) {
            if (Schema::hasColumn($table, $column)) {
                return max(0, (int) ($record->{$column} ?? 0));
            }
        }

        return 0;
    }

    /** @return array{start: string, end: string}|null */
    private function payrollPeriodDateRange(string $period): ?array
    {
        if (! preg_match('/^([A-Za-z]+)\s+(\d{1,2})-(\d{1,2}),\s*(\d{4})$/', trim($period), $matches)) {
            return null;
        }

        $month = date_parse("{$matches[1]} 1 {$matches[4]}");
        $year = (int) $matches[4];
        $startDay = (int) $matches[2];
        $endDay = (int) $matches[3];
        $monthNumber = (int) ($month['month'] ?? 0);
        if (($month['error_count'] ?? 0) > 0
            || $monthNumber < 1 || $monthNumber > 12
            || ! checkdate($monthNumber, $startDay, $year)
            || ! checkdate($monthNumber, $endDay, $year)
            || $startDay > $endDay) {
            return null;
        }

        return [
            'start' => sprintf('%04d-%02d-%02d', $year, $monthNumber, $startDay),
            'end' => sprintf('%04d-%02d-%02d', $year, $monthNumber, $endDay),
        ];
    }

    private function assertClientMoneyMatches(array $payload, string $field, string $expected): void
    {
        if (array_key_exists($field, $payload) && $payload[$field] !== null
            && $this->moneyToCents($payload[$field]) !== $this->moneyToCents($expected)) {
            $this->rejectPayrollMismatch($field, 'The submitted amount does not match the server-calculated payroll amount. Review the payroll breakdown and try again.');
        }
    }

    private function rejectPayrollMismatch(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }

    private function syncProductionSources(int $payrollSlipId, array $sources): void
    {
        if (! Schema::hasTable('payroll_slip_production_sources')) {
            abort(503, 'Payroll production source tracking is unavailable. Apply the payroll production sources migration before preparing payroll.');
        }

        DB::table('payroll_slip_production_sources')->where('payroll_slip_id', $payrollSlipId)->delete();
        if ($sources === []) {
            return;
        }

        $timestamp = now();
        DB::table('payroll_slip_production_sources')->insert(array_map(
            static fn (array $source): array => [
                'payroll_slip_id' => $payrollSlipId,
                'source_table' => $source['source_table'],
                'source_record_id' => $source['source_record_id'],
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            $sources,
        ));
    }

    private function storedProductionSources(object $payrollSlip): array
    {
        if (Schema::hasTable('payroll_slip_production_sources')) {
            $sources = DB::table('payroll_slip_production_sources')
                ->where('payroll_slip_id', $payrollSlip->id)
                ->orderBy('source_table')
                ->orderBy('source_record_id')
                ->get(['source_table', 'source_record_id'])
                ->map(static fn (object $source): array => [
                    'source_table' => (string) $source->source_table,
                    'id' => (int) $source->source_record_id,
                ])
                ->all();
            if ($sources !== []) {
                return $sources;
            }
        }

        if (! empty($payrollSlip->production_record_id)) {
            return [['source_table' => 'production_records', 'id' => (int) $payrollSlip->production_record_id]];
        }
        if (! empty($payrollSlip->production_box_record_id)) {
            return [['source_table' => 'production_box_records', 'id' => (int) $payrollSlip->production_box_record_id]];
        }

        return [];
    }

    /**
     * @param  array<int, array{key: string, result: string}>  $submittedAssessments
     * @return array<string, string>
     */
    private function normalizeFinanceAssessments(array $submittedAssessments, bool $requireMismatch): array
    {
        $assessments = [];
        foreach ($submittedAssessments as $assessment) {
            $key = (string) ($assessment['key'] ?? '');
            if (isset($assessments[$key])) {
                throw ValidationException::withMessages([
                    'manual_assessments' => ['Each Finance assessment area must be submitted exactly once.'],
                ]);
            }

            $assessments[$key] = (string) ($assessment['result'] ?? '');
        }

        $submittedKeys = array_keys($assessments);
        $requiredKeys = self::FINANCE_ASSESSMENT_KEYS;
        sort($submittedKeys);
        sort($requiredKeys);
        if ($submittedKeys !== $requiredKeys) {
            throw ValidationException::withMessages([
                'manual_assessments' => ['Complete every required Finance assessment area before continuing.'],
            ]);
        }

        $hasMismatch = in_array('Not Matched', $assessments, true);
        if ($requireMismatch && ! $hasMismatch) {
            throw ValidationException::withMessages([
                'manual_assessments' => ['Mark at least one assessment area as Not Matched before returning the payroll.'],
            ]);
        }
        if (! $requireMismatch && $hasMismatch) {
            throw ValidationException::withMessages([
                'manual_assessments' => ['A mismatched payroll cannot be validated. Return it for correction instead.'],
            ]);
        }

        return $assessments;
    }

    /** @param array<string, string> $assessments */
    private function storeFinanceAssessment(int $payrollSlipId, array $assessments, int $financeOfficerId, string $decision): void
    {
        if (! Schema::hasTable('payroll_finance_assessment_batches')
            || ! Schema::hasTable('payroll_finance_assessments')) {
            abort(503, 'Finance assessment tracking is unavailable. Apply the Finance assessment migration before validating payroll.');
        }

        $timestamp = now();
        $batchId = DB::table('payroll_finance_assessment_batches')->insertGetId([
            'payroll_slip_id' => $payrollSlipId,
            'assessed_by' => $financeOfficerId,
            'decision' => $decision,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);

        DB::table('payroll_finance_assessments')->insert(array_map(
            static fn (string $key, string $result): array => [
                'assessment_batch_id' => $batchId,
                'assessment_key' => $key,
                'result' => $result,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            array_keys($assessments),
            array_values($assessments),
        ));
    }

    private function assertLatestFinanceAssessmentMatched(int $payrollSlipId): void
    {
        if (! Schema::hasTable('payroll_finance_assessment_batches')
            || ! Schema::hasTable('payroll_finance_assessments')) {
            abort(503, 'Finance assessment tracking is unavailable. Apply the Finance assessment migration before approving payroll.');
        }

        $batch = DB::table('payroll_finance_assessment_batches')
            ->where('payroll_slip_id', $payrollSlipId)
            ->orderByDesc('id')
            ->first();
        if (! $batch || $batch->decision !== 'validated') {
            $this->rejectPayrollMismatch('manual_assessments', 'Manager approval requires a complete matched Finance assessment for this payroll slip.');
        }

        $assessments = DB::table('payroll_finance_assessments')
            ->where('assessment_batch_id', $batch->id)
            ->get(['assessment_key', 'result']);
        $keys = $assessments->pluck('assessment_key')->all();
        sort($keys);
        $requiredKeys = self::FINANCE_ASSESSMENT_KEYS;
        sort($requiredKeys);
        if ($keys !== $requiredKeys || $assessments->contains(fn (object $assessment): bool => $assessment->result !== 'Matched')) {
            $this->rejectPayrollMismatch('manual_assessments', 'The Finance assessment is incomplete or contains a mismatch; payroll cannot be approved.');
        }
    }

    private function assertStoredProductionAndFinancialsMatch(object $payrollSlip, Collection $credits): void
    {
        $sources = $this->storedProductionSources($payrollSlip);
        if ($sources === []) {
            $this->rejectPayrollMismatch('production_sources', 'This payroll slip has no traceable production source records and cannot proceed.');
        }

        $production = $this->productionSourceSummary(
            (int) $payrollSlip->beneficiary_id,
            (string) $payrollSlip->payroll_period,
            $sources,
            lockForUpdate: true,
        );
        foreach ([
            'class_a_boxes' => $production['class_a_boxes'],
            'class_b_boxes' => $production['class_b_boxes'],
            'special_boxes' => $production['special_boxes'],
        ] as $field => $expected) {
            $stored = $field === 'special_boxes'
                ? ($payrollSlip->special_boxes ?? $payrollSlip->special_product_boxes ?? 0)
                : ($payrollSlip->{$field} ?? 0);
            if ((int) $stored !== $expected) {
                $this->rejectPayrollMismatch($field, 'Saved production quantities no longer match the referenced production records. Correct the payroll before proceeding.');
            }
        }

        $grossCents = ($production['class_a_boxes'] * $this->moneyToCents($payrollSlip->class_a_price ?? 0))
            + ($production['class_b_boxes'] * $this->moneyToCents($payrollSlip->class_b_price ?? 0))
            + ($production['special_boxes'] * $this->moneyToCents($payrollSlip->special_price ?? 0));
        $storedGross = $payrollSlip->gross_amount ?? $payrollSlip->gross_income ?? 0;
        if ($this->moneyToCents($storedGross) !== $grossCents) {
            $this->rejectPayrollMismatch('gross_amount', 'Saved gross income does not match the referenced quantities and payroll rates.');
        }

        $otherDeductionsCents = $this->moneyToCents($payrollSlip->other_deductions ?? 0);
        if (Schema::hasTable('payroll_deductions')) {
            $deductionItems = DB::table('payroll_deductions')
                ->where('payroll_slip_id', $payrollSlip->id)
                ->get(['amount']);
            $deductionItemsCents = $deductionItems
                ->sum(fn (object $item): int => $this->moneyToCents($item->amount));
            if ($deductionItems->isNotEmpty()) {
                if ($deductionItemsCents !== $otherDeductionsCents) {
                    $this->rejectPayrollMismatch('other_deductions', 'Saved other deductions do not match the itemized deduction records.');
                }
                $otherDeductionsCents = $deductionItemsCents;
            }
        }

        $creditCents = $this->totalOutstandingCents($credits);
        $savedCreditCents = $this->moneyToCents($payrollSlip->credit_deduction ?? $payrollSlip->material_deduction ?? 0);
        if ($savedCreditCents !== $creditCents) {
            $this->rejectPayrollMismatch('credit_deduction', 'Saved material credit deduction no longer matches the beneficiary credit ledger.');
        }
        if (Schema::hasColumn('payroll_slips', 'material_deduction')
            && $this->moneyToCents($payrollSlip->material_deduction ?? 0) !== $creditCents) {
            $this->rejectPayrollMismatch('material_deduction', 'Saved material deduction does not match the beneficiary credit ledger.');
        }

        $totalDeductionsCents = $creditCents
            + $this->moneyToCents($payrollSlip->previous_balance ?? 0)
            + $this->moneyToCents($payrollSlip->labor_cost ?? 0)
            + $otherDeductionsCents;
        if ($this->moneyToCents($payrollSlip->total_deductions ?? 0) !== $totalDeductionsCents) {
            $this->rejectPayrollMismatch('total_deductions', 'Saved deductions do not match the payroll deduction breakdown.');
        }
        if ($this->moneyToCents($payrollSlip->net_amount ?? $payrollSlip->net_income ?? 0) !== $grossCents - $totalDeductionsCents) {
            $this->rejectPayrollMismatch('net_amount', 'Saved net income does not equal gross income minus total deductions.');
        }
    }

    private function outstandingCreditTransactions(int $beneficiaryId, bool $lockForUpdate = false): Collection
    {
        $beneficiaryCodeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $beneficiaryQuery = DB::table('beneficiaries')
            ->select('id', $beneficiaryCodeColumn.' as beneficiary_code')
            ->where('id', $beneficiaryId);

        if ($lockForUpdate) {
            $beneficiaryQuery->lockForUpdate();
        }

        $beneficiary = $beneficiaryQuery->first();
        abort_if(! $beneficiary || ! is_string($beneficiary->beneficiary_code) || trim($beneficiary->beneficiary_code) === '', 422, 'The payroll beneficiary has no registered beneficiary code for credit reconciliation.');

        $query = DB::table('credit_transactions')
            ->where('beneficiary_account_id', trim($beneficiary->beneficiary_code))
            ->where('remaining_balance', '>', 0)
            ->orderBy('id');

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->get();
    }

    private function assertCreditDeductionMatches(object $payrollSlip, Collection $credits): void
    {
        $actualCents = $this->totalOutstandingCents($credits);
        $savedCents = $this->moneyToCents($payrollSlip->credit_deduction ?? $payrollSlip->material_deduction ?? 0);

        abort_if(
            $savedCents !== $actualCents,
            422,
            'The beneficiary credit balance changed after payroll preparation. Refresh or update the payroll so its full outstanding credit deduction matches the ledger before continuing.',
        );
    }

    private function totalOutstandingCents(Collection $credits): int
    {
        return $credits->sum(fn (object $credit): int => $this->moneyToCents($credit->remaining_balance));
    }

    private function moneyToCents(mixed $amount): int
    {
        $formatted = number_format((float) ($amount ?? 0), 2, '.', '');
        $negative = str_starts_with($formatted, '-');
        $absolute = ltrim($formatted, '-');
        [$whole, $fraction] = array_pad(explode('.', $absolute, 2), 2, '00');
        $cents = ((int) $whole * 100) + (int) substr(str_pad($fraction, 2, '0'), 0, 2);

        return $negative ? -$cents : $cents;
    }

    private function centsToMoney(int $cents): string
    {
        $negative = $cents < 0;
        $absolute = abs($cents);

        return ($negative ? '-' : '').intdiv($absolute, 100).'.'.str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'slip_no' => ['nullable', 'string', 'max:255'],
            'beneficiary_id' => ['required', 'integer', Rule::exists('beneficiaries', 'id')],
            'beneficiary_name' => ['nullable', 'string', 'max:255'],
            'beneficiary_code' => ['nullable', 'string', 'max:255'],
            'beneficiary_contact_number' => ['nullable', 'string', 'max:255'],
            'beneficiary_address' => ['nullable', 'string'],
            'production_record_id' => ['nullable', 'integer'],
            'production_sources' => ['required', 'array', 'min:1'],
            'production_sources.*.source_table' => ['required', Rule::in(['production_records', 'production_box_records'])],
            'production_sources.*.id' => ['required', 'integer', 'min:1'],
            'payroll_period' => ['required', 'string', 'max:255'],
            'harvest_date' => ['nullable', 'date'],
            'class_a_boxes' => ['nullable', 'integer', 'min:0'],
            'class_b_boxes' => ['nullable', 'integer', 'min:0'],
            'special_boxes' => ['nullable', 'integer', 'min:0'],
            'class_a_price' => ['required', 'numeric', 'min:0'],
            'class_b_price' => ['required', 'numeric', 'min:0'],
            'special_price' => ['required', 'numeric', 'min:0'],
            'material_deduction' => ['nullable', 'numeric', 'min:0'],
            'previous_balance' => ['nullable', 'numeric', 'min:0'],
            'labor_cost' => ['nullable', 'numeric', 'min:0'],
            'other_deductions' => ['nullable', 'numeric', 'min:0'],
            'other_deduction_items' => ['nullable', 'array'],
            'other_deduction_items.*.type' => ['required_with:other_deduction_items', 'string', 'max:255'],
            'other_deduction_items.*.amount' => ['required_with:other_deduction_items', 'numeric', 'min:'.self::MIN_AUTHORIZED_DEDUCTION_AMOUNT],
            'gross_amount' => ['required', 'numeric'],
            'credit_deduction' => ['nullable', 'numeric', 'min:0'],
            'total_deductions' => ['required', 'numeric', 'min:0'],
            'net_amount' => ['required', 'numeric'],
            'validation_status' => ['required', Rule::in(['Draft', 'Submitted for Validation'])],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function values(array $payload, ?string $slipNo, ?object $current = null): array
    {
        $validationStatus = $payload['validation_status'];
        $userId = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);

        $values = [
            'slip_no' => $slipNo,
            'beneficiary_id' => $payload['beneficiary_id'],
            'payroll_period' => $payload['payroll_period'],
            'harvest_date' => $payload['harvest_date'] ?? null,
            'class_a_boxes' => $payload['class_a_boxes'] ?? 0,
            'class_b_boxes' => $payload['class_b_boxes'] ?? 0,
            'special_boxes' => $payload['special_boxes'] ?? 0,
            'class_a_price' => $payload['class_a_price'] ?? 0,
            'class_b_price' => $payload['class_b_price'] ?? 0,
            'special_price' => $payload['special_price'] ?? 0,
            'material_deduction' => $payload['material_deduction'] ?? 0,
            'previous_balance' => $payload['previous_balance'] ?? 0,
            'labor_cost' => $payload['labor_cost'] ?? 0,
            'other_deductions' => $payload['other_deductions'] ?? 0,
            'gross_amount' => $payload['gross_amount'],
            'credit_deduction' => $payload['credit_deduction'] ?? 0,
            'total_deductions' => $payload['total_deductions'],
            'net_amount' => $payload['net_amount'],
            'validation_status' => $validationStatus,
            'approval_status' => 'Pending Approval',
            'prepared_by' => $current?->prepared_by ?? $userId,
        ];

        if (Schema::hasTable('payroll_batches') && Schema::hasColumn('payroll_slips', 'batch_id')) {
            $values['batch_id'] = $current?->batch_id ?? $this->batchId($payload['payroll_period'], $userId);
        }

        $beneficiarySnapshot = $this->beneficiarySnapshot($payload);
        foreach ($beneficiarySnapshot as $column => $value) {
            if (Schema::hasColumn('payroll_slips', $column)) {
                $values[$column] = $value;
            }
        }

        $singleSource = count($payload['production_sources'] ?? []) === 1
            ? $payload['production_sources'][0]
            : null;
        if (Schema::hasColumn('payroll_slips', 'production_record_id')) {
            $values['production_record_id'] = ($singleSource['source_table'] ?? null) === 'production_records'
                ? $singleSource['source_record_id']
                : null;
        }
        if (Schema::hasColumn('payroll_slips', 'production_box_record_id')) {
            $values['production_box_record_id'] = ($singleSource['source_table'] ?? null) === 'production_box_records'
                ? $singleSource['source_record_id']
                : null;
        }

        foreach ([
            'special_boxes' => 'special_product_boxes',
            'gross_amount' => 'gross_income',
            'net_amount' => 'net_income',
        ] as $currentColumn => $legacyColumn) {
            if (! Schema::hasColumn('payroll_slips', $currentColumn) && Schema::hasColumn('payroll_slips', $legacyColumn)) {
                $values[$legacyColumn] = $values[$currentColumn];
            }
        }

        if ($validationStatus === 'Submitted for Validation') {
            $isResubmission = ($current?->validation_status ?? '') === 'Returned for Correction';
            $values['submitted_at'] = now();
            $this->putIfColumn($values, 'validated_by', null);
            $this->putIfColumn($values, 'validated_at', null);
            $this->putIfColumn($values, 'approved_by', null);
            $this->putIfColumn($values, 'approved_at', null);
            if ($isResubmission) {
                $this->putIfColumn($values, 'resubmitted_at', now());
                $this->putIfColumn($values, 'resubmission_count', (int) ($current?->resubmission_count ?? 0) + 1);
            }
        }

        $availableColumns = array_fill_keys(Schema::getColumnListing('payroll_slips'), true);

        return array_intersect_key($values, $availableColumns);
    }

    private function putIfColumn(array &$values, string $column, mixed $value): void
    {
        if (Schema::hasColumn('payroll_slips', $column)) {
            $values[$column] = $value;
        }
    }

    private function batchId(string $period, ?int $userId): int
    {
        $batchNo = 'PB-'.preg_replace('/[^0-9A-Za-z]+/', '-', trim($period));
        $existing = DB::table('payroll_batches')->where('batch_no', $batchNo)->value('id');
        if ($existing) {
            return (int) $existing;
        }

        [$start, $end] = $this->periodDates($period);

        return DB::table('payroll_batches')->insertGetId([
            'batch_no' => $batchNo,
            'period_start' => $start,
            'period_end' => $end,
            'status' => 'Draft',
            'prepared_by' => $userId ?? DB::table('users')->value('id'),
            'total_amount' => 0,
        ]);
    }

    private function periodDates(string $period): array
    {
        if (preg_match('/([A-Za-z]+)\s+(\d{1,2})-(\d{1,2}),\s*(\d{4})/', $period, $matches)) {
            $start = date('Y-m-d', strtotime("{$matches[1]} {$matches[2]}, {$matches[4]}"));
            $end = date('Y-m-d', strtotime("{$matches[1]} {$matches[3]}, {$matches[4]}"));

            return [$start, $end];
        }

        $today = now()->toDateString();

        return [$today, $today];
    }

    private function nextSlipNo(): string
    {
        return 'BP-'.now()->format('YmdHis');
    }

    private function findSlip(int $id): object
    {
        $joinedBeneficiaryName = Schema::hasColumn('beneficiaries', 'full_name') ? 'beneficiaries.full_name' : 'beneficiaries.name';
        $beneficiaryName = Schema::hasColumn('payroll_slips', 'beneficiary_name')
            ? "COALESCE(NULLIF(payroll_slips.beneficiary_name, ''), $joinedBeneficiaryName)"
            : $joinedBeneficiaryName;
        $userNameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
        $preparedName = "prepared_user.$userNameColumn";
        $validatedName = "validated_user.$userNameColumn";
        $approvedName = "approved_user.$userNameColumn";
        $query = DB::table('payroll_slips')
            ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'payroll_slips.beneficiary_id')
            ->leftJoin('users as prepared_user', 'prepared_user.id', '=', 'payroll_slips.prepared_by')
            ->leftJoin('users as validated_user', 'validated_user.id', '=', 'payroll_slips.validated_by')
            ->leftJoin('users as approved_user', 'approved_user.id', '=', 'payroll_slips.approved_by');

        $returnedName = 'null';
        if (Schema::hasColumn('payroll_slips', 'returned_by')) {
            $query->leftJoin('users as returned_user', 'returned_user.id', '=', 'payroll_slips.returned_by');
            $returnedName = "returned_user.$userNameColumn";
        }

        $slip = $query
            ->selectRaw("payroll_slips.*, $beneficiaryName as beneficiary_name, $preparedName as prepared_by_name, $validatedName as validated_by_name, $approvedName as approved_by_name, $returnedName as returned_by_name")
            ->where('payroll_slips.id', $id)
            ->first();

        if ($slip && Schema::hasTable('payroll_deductions')) {
            $slip->deductions = DB::table('payroll_deductions')
                ->where('payroll_slip_id', $id)
                ->orderBy('id')
                ->get()
                ->all();
        }
        if ($slip) {
            $slip->production_sources = $this->storedProductionSources($slip);
        }

        return $slip;
    }

    private function syncOtherDeductions(int $slipId, array $items): void
    {
        if (! Schema::hasTable('payroll_deductions')) {
            return;
        }

        DB::table('payroll_deductions')->where('payroll_slip_id', $slipId)->delete();

        $rows = collect($items)
            ->map(function ($item) use ($slipId) {
                $amount = (float) ($item['amount'] ?? 0);
                if ($amount <= 0) {
                    return null;
                }

                return [
                    'payroll_slip_id' => $slipId,
                    'deduction_type' => trim((string) ($item['type'] ?? 'Other Authorized Deduction')) ?: 'Other Authorized Deduction',
                    'amount' => $amount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->filter()
            ->values()
            ->all();

        if ($rows) {
            DB::table('payroll_deductions')->insert($rows);
        }
    }

    private function beneficiarySnapshot(array $payload): array
    {
        if (! Schema::hasTable('beneficiaries')) {
            return [
                'beneficiary_name' => $payload['beneficiary_name'] ?? null,
                'beneficiary_code' => $payload['beneficiary_code'] ?? null,
                'beneficiary_contact_number' => $payload['beneficiary_contact_number'] ?? null,
                'beneficiary_address' => $payload['beneficiary_address'] ?? null,
            ];
        }

        $record = null;
        if (! empty($payload['beneficiary_id'])) {
            $record = DB::table('beneficiaries')->where('id', $payload['beneficiary_id'])->first();
        }

        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
        $codeColumn = Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
        $contactColumn = $this->beneficiaryContactColumn();

        return [
            'beneficiary_name' => $record->{$nameColumn} ?? ($payload['beneficiary_name'] ?? null),
            'beneficiary_code' => $record->{$codeColumn} ?? ($payload['beneficiary_code'] ?? null),
            'beneficiary_contact_number' => $contactColumn && $record
                ? ($record->{$contactColumn} ?? null)
                : ($payload['beneficiary_contact_number'] ?? null),
            'beneficiary_address' => $record->address ?? ($payload['beneficiary_address'] ?? null),
        ];
    }

    private function beneficiaryContactColumn(): ?string
    {
        if (! Schema::hasTable('beneficiaries')) {
            return null;
        }

        foreach (['contact_number', 'contact_no', 'contact', 'phone', 'mobile_number'] as $column) {
            if (Schema::hasColumn('beneficiaries', $column)) {
                return $column;
            }
        }

        return null;
    }

    private function recordAudit(?int $userId, ?string $userName, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $userId = $this->resolveUserId($userId, $userName);
        $values = ['module' => 'Payroll', 'action' => $action];

        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $values['user_id'] = $userId;
        }
        if (Schema::hasColumn('audit_logs', 'user_name')) {
            $values['user_name'] = $userName;
        }
        if (Schema::hasColumn('audit_logs', 'details')) {
            $values['details'] = $description;
        }
        if (Schema::hasColumn('audit_logs', 'description')) {
            $values['description'] = $description;
        }
        if (Schema::hasColumn('audit_logs', 'status')) {
            $values['status'] = 'Completed';
        }
        if (Schema::hasColumn('audit_logs', 'created_at')) {
            $values['created_at'] = now();
        }
        if (Schema::hasColumn('audit_logs', 'updated_at')) {
            $values['updated_at'] = now();
        }
        if (Schema::hasColumn('audit_logs', 'logged_at')) {
            $values['logged_at'] = now();
        }

        try {
            DB::table('audit_logs')->insert($values);
        } catch (\Throwable) {
            // Audit logging should never block payroll saves or submissions.
        }
    }

    private function resolveUserId(?int $userId, ?string $userName): ?int
    {
        if (! Schema::hasTable('users')) {
            return null;
        }

        if ($userId && DB::table('users')->where('id', $userId)->exists()) {
            return $userId;
        }

        if ($userName) {
            $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : (Schema::hasColumn('users', 'name') ? 'name' : null);
            if ($nameColumn) {
                $matched = DB::table('users')->where($nameColumn, $userName)->value('id');
                if ($matched) {
                    return (int) $matched;
                }
            }
        }

        return DB::table('users')->value('id');
    }
}
