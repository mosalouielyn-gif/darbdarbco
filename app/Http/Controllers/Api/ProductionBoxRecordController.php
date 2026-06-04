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
        $id = DB::table('production_box_records')->insertGetId($this->recordValues($payload));

        $record = $this->findRecord($id);
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Created',
            "Created production box record #{$id} for {$payload['beneficiary_name']}",
        );

        return response()->json($record, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        DB::table('production_box_records')->where('id', $id)->update($this->recordValues($payload, false));

        $record = $this->findRecord($id);
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Updated',
            "Updated production box record #{$id} for {$payload['beneficiary_name']}",
        );

        return response()->json($record);
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
        ]);
    }

    private function recordValues(array $payload, bool $creating = true): array
    {
        $beneficiaryId = $this->resolveBeneficiaryId($payload['beneficiary_name']);
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
            $values['created_by'] = $payload['user_id'] ?? null;
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
