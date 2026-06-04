<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PayrollSlipController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $slipNo = $payload['slip_no'] ?? $this->nextSlipNo();
        $values = $this->values($payload, $slipNo);

        $id = DB::table('payroll_slips')->insertGetId($values);
        $record = $this->findSlip($id);

        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Created', "Created payroll slip {$slipNo}");
        if (($values['validation_status'] ?? 'Draft') === 'Submitted for Validation') {
            $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Submitted', "Submitted payroll slip {$slipNo} for validation");
        }

        return response()->json($record, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $current = DB::table('payroll_slips')->where('id', $id)->first();
        abort_if(! $current, 404, 'Payroll slip not found.');
        abort_if(($current->validation_status ?? 'Draft') === 'Validated' || ($current->approval_status ?? '') === 'Approved', 422, 'Validated or approved payroll slips cannot be edited.');

        $payload = $this->validatedPayload($request);
        DB::table('payroll_slips')->where('id', $id)->update($this->values($payload, $current->slip_no ?? null, $current));

        $record = $this->findSlip($id);
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Updated', "Updated payroll slip {$record->slip_no}");

        return response()->json($record);
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $current = DB::table('payroll_slips')->where('id', $id)->first();
        abort_if(! $current, 404, 'Payroll slip not found.');
        abort_if(($current->validation_status ?? '') === 'Validated' || ($current->approval_status ?? '') === 'Approved', 422, 'Validated or approved payroll slips cannot be submitted again.');

        DB::table('payroll_slips')->where('id', $id)->update([
            'validation_status' => 'Submitted for Validation',
            'approval_status' => 'Pending Approval',
            'submitted_at' => now(),
        ]);

        $record = $this->findSlip($id);
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Submitted', "Submitted payroll slip {$record->slip_no} for validation");

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
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        $current = DB::table('payroll_slips')->where('id', $id)->first();
        abort_if(! $current, 404, 'Payroll slip not found.');
        abort_if(! in_array(($current->validation_status ?? ''), ['Submitted for Validation', 'Returned for Correction'], true), 422, 'Only submitted or returned payroll slips can be validated.');

        DB::table('payroll_slips')->where('id', $id)->update([
            'validation_status' => 'Validated',
            'approval_status' => 'Pending Manager Approval',
            'validated_by' => $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null),
            'validated_at' => now(),
        ]);

        $record = $this->findSlip($id);
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Validated', $payload['remarks'] ?? "Validated payroll slip {$record->slip_no}");

        return response()->json($record);
    }

    public function returnForCorrection(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'category' => ['required', 'string', 'max:255'],
            'reason' => ['required', 'string'],
            'remarks' => ['nullable', 'string'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $current = DB::table('payroll_slips')->where('id', $id)->first();
        abort_if(! $current, 404, 'Payroll slip not found.');
        abort_if(($current->validation_status ?? '') === 'Validated' || ($current->approval_status ?? '') === 'Approved', 422, 'Validated or approved payroll slips cannot be returned.');

        DB::table('payroll_slips')->where('id', $id)->update([
            'validation_status' => 'Returned for Correction',
            'approval_status' => 'Pending Approval',
            'validated_by' => $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null),
            'validated_at' => now(),
        ]);

        $record = $this->findSlip($id);
        $details = "{$payload['category']}: {$payload['reason']}";
        if (! empty($payload['remarks'])) {
            $details .= " Remarks: {$payload['remarks']}";
        }
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Returned', "Returned payroll slip {$record->slip_no} - {$details}");

        return response()->json($record);
    }

    public function approveByManager(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        $current = DB::table('payroll_slips')->where('id', $id)->first();
        abort_if(! $current, 404, 'Payroll slip not found.');
        abort_if(($current->validation_status ?? '') !== 'Validated', 422, 'Only Finance-validated payroll slips can be approved.');
        abort_if(($current->approval_status ?? '') === 'Approved', 422, 'Payroll slip is already approved.');

        DB::table('payroll_slips')->where('id', $id)->update([
            'approval_status' => 'Approved',
            'approved_by' => $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null),
            'approved_at' => now(),
        ]);

        $record = $this->findSlip($id);
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Approved', $payload['remarks'] ?? "Approved payroll slip {$record->slip_no}");

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
        abort_if(($current->validation_status ?? '') !== 'Validated', 422, 'Only Finance-validated payroll slips can be returned by Manager.');
        abort_if(($current->approval_status ?? '') === 'Approved', 422, 'Approved payroll slips cannot be returned.');

        DB::table('payroll_slips')->where('id', $id)->update([
            'validation_status' => 'Returned for Correction',
            'approval_status' => 'Pending Approval',
            'approved_by' => $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null),
            'approved_at' => now(),
        ]);

        $record = $this->findSlip($id);
        $details = $payload['reason'];
        if (! empty($payload['remarks'])) {
            $details .= " Remarks: {$payload['remarks']}";
        }
        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, 'Returned', "Manager returned payroll slip {$record->slip_no} - {$details}");

        return response()->json($record);
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'slip_no' => ['nullable', 'string', 'max:255'],
            'beneficiary_id' => ['required', 'integer'],
            'production_record_id' => ['nullable', 'integer'],
            'payroll_period' => ['required', 'string', 'max:255'],
            'harvest_date' => ['nullable', 'date'],
            'class_a_boxes' => ['nullable', 'integer', 'min:0'],
            'class_b_boxes' => ['nullable', 'integer', 'min:0'],
            'special_boxes' => ['nullable', 'integer', 'min:0'],
            'class_a_price' => ['nullable', 'numeric', 'min:0'],
            'class_b_price' => ['nullable', 'numeric', 'min:0'],
            'special_price' => ['nullable', 'numeric', 'min:0'],
            'material_deduction' => ['nullable', 'numeric', 'min:0'],
            'previous_balance' => ['nullable', 'numeric', 'min:0'],
            'labor_cost' => ['nullable', 'numeric', 'min:0'],
            'other_deductions' => ['nullable', 'numeric', 'min:0'],
            'gross_amount' => ['required', 'numeric'],
            'credit_deduction' => ['nullable', 'numeric', 'min:0'],
            'total_deductions' => ['required', 'numeric', 'min:0'],
            'net_amount' => ['required', 'numeric'],
            'validation_status' => ['required', 'string', 'max:255'],
            'approval_status' => ['nullable', 'string', 'max:255'],
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
            'batch_id' => $current?->batch_id ?? $this->batchId($payload['payroll_period'], $userId),
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
            'approval_status' => $validationStatus === 'Submitted for Validation' ? 'Pending Approval' : ($payload['approval_status'] ?? 'Pending Approval'),
            'prepared_by' => $current?->prepared_by ?? $userId,
        ];

        if (Schema::hasColumn('payroll_slips', 'production_record_id')) {
            $values['production_record_id'] = $payload['production_record_id'] ?? null;
        } elseif (Schema::hasColumn('payroll_slips', 'production_box_record_id')) {
            $values['production_box_record_id'] = $payload['production_record_id'] ?? null;
        }

        if ($validationStatus === 'Submitted for Validation') {
            $values['submitted_at'] = $current?->submitted_at ?? now();
        }

        return $values;
    }

    private function batchId(string $period, ?int $userId): int
    {
        $batchNo = 'PB-'.preg_replace('/[^0-9A-Za-z]+/', '-', trim($period));
        $existing = DB::table('payroll_batches')->where('batch_no', $batchNo)->value('id');
        if ($existing) return (int) $existing;

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
        $beneficiaryName = Schema::hasColumn('beneficiaries', 'full_name') ? 'beneficiaries.full_name' : 'beneficiaries.name';
        $userNameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
        $preparedName = "prepared_user.$userNameColumn";
        $validatedName = "validated_user.$userNameColumn";
        $approvedName = "approved_user.$userNameColumn";

        return DB::table('payroll_slips')
            ->leftJoin('beneficiaries', 'beneficiaries.id', '=', 'payroll_slips.beneficiary_id')
            ->leftJoin('users as prepared_user', 'prepared_user.id', '=', 'payroll_slips.prepared_by')
            ->leftJoin('users as validated_user', 'validated_user.id', '=', 'payroll_slips.validated_by')
            ->leftJoin('users as approved_user', 'approved_user.id', '=', 'payroll_slips.approved_by')
            ->selectRaw("payroll_slips.*, $beneficiaryName as beneficiary_name, $preparedName as prepared_by_name, $validatedName as validated_by_name, $approvedName as approved_by_name")
            ->where('payroll_slips.id', $id)
            ->first();
    }

    private function recordAudit(?int $userId, ?string $userName, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) return;

        $userId = $this->resolveUserId($userId, $userName);
        $values = ['module' => 'Payroll', 'action' => $action];
        if (Schema::hasColumn('audit_logs', 'user_id')) $values['user_id'] = $userId;
        if (Schema::hasColumn('audit_logs', 'user_name')) $values['user_name'] = $userName;
        if (Schema::hasColumn('audit_logs', 'details')) $values['details'] = $description;
        if (Schema::hasColumn('audit_logs', 'description')) $values['description'] = $description;
        if (Schema::hasColumn('audit_logs', 'status')) $values['status'] = 'Completed';
        if (Schema::hasColumn('audit_logs', 'created_at')) $values['created_at'] = now();
        if (Schema::hasColumn('audit_logs', 'updated_at')) $values['updated_at'] = now();
        if (Schema::hasColumn('audit_logs', 'logged_at')) $values['logged_at'] = now();

        DB::table('audit_logs')->insert($values);
    }

    private function resolveUserId(?int $userId, ?string $userName): ?int
    {
        if ($userId) return $userId;
        if (! Schema::hasTable('users')) return null;

        if ($userName) {
            $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : (Schema::hasColumn('users', 'name') ? 'name' : null);
            if ($nameColumn) {
                $matched = DB::table('users')->where($nameColumn, $userName)->value('id');
                if ($matched) return (int) $matched;
            }
        }

        return DB::table('users')->value('id');
    }
}
