<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProductionBoxRecordController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json($this->records());
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $recordValues = $this->recordValues($payload);
        $id = DB::table('production_box_records')->insertGetId($recordValues);

        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Created',
            "Created production box record #{$id} for {$payload['beneficiary_name']}",
        );

        return response()->json((object) array_merge(['id' => $id], $recordValues), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $current = $this->findRecord($id);
        abort_if(! $current, 404, 'Production box record not found.');
        $values = $this->recordValues($payload, false);

        DB::table('production_box_records')->where('id', $id)->update($values);

        $this->recordFieldChangeAudit($current, $values, $payload, $id);

        return response()->json((object) array_merge((array) $current, $values));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $record = $this->findRecord($id);

        DB::table('production_box_records')->where('id', $id)->delete();

        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $beneficiary = $record?->beneficiary_name ?? 'unknown beneficiary';
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Deleted',
            "Deleted production box record #{$id} for {$beneficiary}",
        );

        return response()->json(['message' => 'Production box record deleted.']);
    }

    private function records(): array
    {
        if (! Schema::hasTable('production_box_records')) {
            return [];
        }

        return DB::table('production_box_records')
            ->select($this->selectColumns())
            ->orderByDesc('production_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->all();
    }

    private function findRecord(int $id): ?object
    {
        return DB::table('production_box_records')
            ->select($this->selectColumns())
            ->where('id', $id)
            ->first();
    }

    private function selectColumns(): array
    {
        $columns = [
            'id',
            'record_no',
            'production_date',
            'beneficiary_id',
            'class_a_big_hands',
            'class_a_small_hands',
            'class_a_cps',
            'class_b_big_hands',
            'class_b_small_hands',
            'class_b_cps',
            'special_product',
            'defects_11_weeks',
            'defects_12_weeks',
            'defects_13_weeks',
            'defects_14_weeks',
            'rejects_11_weeks',
            'rejects_12_weeks',
            'rejects_13_weeks',
            'rejects_14_weeks',
            'created_by',
            'created_at',
            'updated_at',
        ];

        if (Schema::hasColumn('production_box_records', 'beneficiary_name')) {
            $columns[] = 'beneficiary_name';
        }

        return $columns;
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'production_date' => ['required', 'date'],
            'beneficiary_name' => ['required', 'string', 'max:255'],
            'class_a_big_hands' => ['required', 'integer', 'min:0'],
            'class_a_small_hands' => ['required', 'integer', 'min:0'],
            'class_a_cps' => ['required', 'integer', 'min:0'],
            'class_b_big_hands' => ['required', 'integer', 'min:0'],
            'class_b_small_hands' => ['required', 'integer', 'min:0'],
            'class_b_cps' => ['required', 'integer', 'min:0'],
            'special_product' => ['required', 'integer', 'min:0'],
            'defects_11_weeks' => ['required', 'integer', 'min:0'],
            'defects_12_weeks' => ['required', 'integer', 'min:0'],
            'defects_13_weeks' => ['required', 'integer', 'min:0'],
            'defects_14_weeks' => ['required', 'integer', 'min:0'],
            'rejects_11_weeks' => ['required', 'integer', 'min:0'],
            'rejects_12_weeks' => ['required', 'integer', 'min:0'],
            'rejects_13_weeks' => ['required', 'integer', 'min:0'],
            'rejects_14_weeks' => ['required', 'integer', 'min:0'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
            'edit_reason' => ['nullable', 'string'],
        ]);
    }

    private function recordValues(array $payload, bool $creating = true): array
    {
        $beneficiaryId = $this->resolveBeneficiaryId($payload['beneficiary_name']);
        $createdBy = $this->resolveUserId($payload['user_id'] ?? null, $payload['user_name'] ?? null);
        $values = [
            'production_date' => $payload['production_date'],
            'beneficiary_id' => $beneficiaryId,
            'class_a_big_hands' => $payload['class_a_big_hands'],
            'class_a_small_hands' => $payload['class_a_small_hands'],
            'class_a_cps' => $payload['class_a_cps'],
            'class_b_big_hands' => $payload['class_b_big_hands'],
            'class_b_small_hands' => $payload['class_b_small_hands'],
            'class_b_cps' => $payload['class_b_cps'],
            'special_product' => $payload['special_product'],
            'defects_11_weeks' => $payload['defects_11_weeks'],
            'defects_12_weeks' => $payload['defects_12_weeks'],
            'defects_13_weeks' => $payload['defects_13_weeks'],
            'defects_14_weeks' => $payload['defects_14_weeks'],
            'rejects_11_weeks' => $payload['rejects_11_weeks'],
            'rejects_12_weeks' => $payload['rejects_12_weeks'],
            'rejects_13_weeks' => $payload['rejects_13_weeks'],
            'rejects_14_weeks' => $payload['rejects_14_weeks'],
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('production_box_records', 'beneficiary_name')) {
            $values['beneficiary_name'] = $payload['beneficiary_name'];
        }

        if ($creating) {
            $values['record_no'] = $this->nextRecordNo();
            $values['created_by'] = $createdBy;
            $values['created_at'] = now();
        }

        return $values;
    }

    private function resolveBeneficiaryId(string $name): ?int
    {
        if (! Schema::hasTable('beneficiaries')) {
            return null;
        }

        $nameColumn = Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : (Schema::hasColumn('beneficiaries', 'name') ? 'name' : null);
        if (! $nameColumn) {
            return null;
        }

        $existing = DB::table('beneficiaries')->where($nameColumn, $name)->value('id');
        if ($existing) {
            return (int) $existing;
        }

        $values = [$nameColumn => $name];
        $code = 'BEN-'.now()->format('ymdHis');
        if (Schema::hasColumn('beneficiaries', 'code')) {
            $values['code'] = $code;
        }
        if (Schema::hasColumn('beneficiaries', 'beneficiary_code')) {
            $values['beneficiary_code'] = $code;
        }
        if (Schema::hasColumn('beneficiaries', 'active')) {
            $values['active'] = true;
        }
        if (Schema::hasColumn('beneficiaries', 'created_at')) {
            $values['created_at'] = now();
        }
        if (Schema::hasColumn('beneficiaries', 'updated_at')) {
            $values['updated_at'] = now();
        }

        return (int) DB::table('beneficiaries')->insertGetId($values);
    }

    private function nextRecordNo(): string
    {
        return 'PBR-'.now()->format('Ymd-His').'-'.random_int(100, 999);
    }

    private function recordAudit(?int $userId, ?string $userName, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $userId = $this->resolveUserId($userId, $userName);
        $values = [
            'module' => 'Production',
            'action' => $action,
        ];

        if (Schema::hasColumn('audit_logs', 'id')) {
            $maxId = (int) DB::table('audit_logs')->max('id');
            $values['id'] = $maxId + 1;
        }

        if (Schema::hasColumn('audit_logs', 'status')) {
            $values['status'] = 'Completed';
        }

        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $values['user_id'] = $userId;
        }

        if (Schema::hasColumn('audit_logs', 'user_name')) {
            $values['user_name'] = $userName;
        }

        if (Schema::hasColumn('audit_logs', 'description')) {
            $values['description'] = $description;
        }

        if (Schema::hasColumn('audit_logs', 'details')) {
            $values['details'] = $description;
        }

        if (Schema::hasColumn('audit_logs', 'logged_at')) {
            $values['logged_at'] = now();
        }

        if (Schema::hasColumn('audit_logs', 'created_at')) {
            $values['created_at'] = now();
        }

        if (Schema::hasColumn('audit_logs', 'updated_at')) {
            $values['updated_at'] = now();
        }

        try {
            DB::table('audit_logs')->insert($values);
        } catch (\Throwable) {
            // Audit logging should never block production box record saves.
        }
    }

    private function recordFieldChangeAudit(object $current, array $values, array $payload, int $id): void
    {
        $reason = trim((string) ($payload['edit_reason'] ?? 'No reason provided.'));
        $changes = [];

        foreach ($this->auditFieldLabels() as $field => $label) {
            if (! array_key_exists($field, $values)) {
                continue;
            }

            $previous = $current->{$field} ?? null;
            $updated = $values[$field] ?? null;
            if ((string) $previous === (string) $updated) {
                continue;
            }

            $changes[] = "Field changed: {$label}; Previous value: {$previous}; Updated value: {$updated}";
        }

        $details = count($changes) > 0
            ? implode(' | ', $changes)
            : 'No field value changed';

        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Updated',
            "Production record #{$id}; {$details}; Reason for editing: {$reason}",
        );
    }

    private function auditFieldLabels(): array
    {
        return [
            'production_date' => 'Production Date',
            'beneficiary_id' => 'Beneficiary ID',
            'beneficiary_name' => 'Beneficiary Name',
            'class_a_big_hands' => 'Class A Big Hands',
            'class_a_small_hands' => 'Class A Small Hands',
            'class_a_cps' => 'Class A CPs',
            'class_b_big_hands' => 'Class B Big Hands',
            'class_b_small_hands' => 'Class B Small Hands',
            'class_b_cps' => 'Class B CPs',
            'special_product' => 'Special Product',
            'defects_11_weeks' => 'Defects 11 Weeks',
            'defects_12_weeks' => 'Defects 12 Weeks',
            'defects_13_weeks' => 'Defects 13 Weeks',
            'defects_14_weeks' => 'Defects 14 Weeks',
            'rejects_11_weeks' => 'Rejects 11 Weeks',
            'rejects_12_weeks' => 'Rejects 12 Weeks',
            'rejects_13_weeks' => 'Rejects 13 Weeks',
            'rejects_14_weeks' => 'Rejects 14 Weeks',
        ];
    }

    private function resolveUserId(?int $userId, ?string $userName): ?int
    {
        if (! Schema::hasTable('users')) return null;
        if ($userId && DB::table('users')->where('id', $userId)->exists()) return $userId;

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
