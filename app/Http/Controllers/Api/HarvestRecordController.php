<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HarvestRecordController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json($this->records());
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $id = DB::table('harvest_records')->insertGetId($this->recordValues($payload));

        $record = $this->findRecord($id);
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Created',
            "Created harvest record #{$id} for {$payload['beneficiary_name']}",
        );

        return response()->json($record, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        DB::table('harvest_records')->where('id', $id)->update($this->recordValues($payload, false));

        $record = $this->findRecord($id);
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Updated',
            "Updated harvest record #{$id} for {$payload['beneficiary_name']}",
        );

        return response()->json($record);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $record = $this->findRecord($id);

        DB::table('harvest_records')->where('id', $id)->delete();

        $payload = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $beneficiary = $record?->beneficiary_name ?? 'unknown beneficiary';
        $this->recordAudit(
            $payload['user_id'] ?? null,
            $payload['user_name'] ?? null,
            'Deleted',
            "Deleted harvest record #{$id} for {$beneficiary}",
        );

        return response()->json(['message' => 'Harvest record deleted.']);
    }

    private function records(): array
    {
        if (! Schema::hasTable('harvest_records')) {
            return [];
        }

        return DB::table('harvest_records')
            ->select([
                'id',
                'harvest_date',
                'beneficiary_id',
                'beneficiary_name',
                'harvester_name',
                'buligs_11_weeks',
                'buligs_12_weeks',
                'buligs_13_weeks',
                'buligs_14_weeks',
                'total_buligs',
                'created_by',
                'created_at',
                'updated_at',
            ])
            ->orderByDesc('harvest_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->all();
    }

    private function findRecord(int $id): ?object
    {
        return DB::table('harvest_records')->where('id', $id)->first();
    }

    private function validatedPayload(Request $request): array
    {
        $payload = $request->validate([
            'harvest_date' => ['required', 'date'],
            'beneficiary_name' => ['required', 'string', 'max:255'],
            'harvester_name' => ['required', 'string', 'max:255'],
            'buligs_11_weeks' => ['required', 'integer', 'min:0'],
            'buligs_12_weeks' => ['required', 'integer', 'min:0'],
            'buligs_13_weeks' => ['required', 'integer', 'min:0'],
            'buligs_14_weeks' => ['required', 'integer', 'min:0'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $payload['total_buligs'] = $payload['buligs_11_weeks']
            + $payload['buligs_12_weeks']
            + $payload['buligs_13_weeks']
            + $payload['buligs_14_weeks'];

        return $payload;
    }

    private function recordValues(array $payload, bool $creating = true): array
    {
        $values = [
            'harvest_date' => $payload['harvest_date'],
            'beneficiary_name' => $payload['beneficiary_name'],
            'harvester_name' => $payload['harvester_name'],
            'buligs_11_weeks' => $payload['buligs_11_weeks'],
            'buligs_12_weeks' => $payload['buligs_12_weeks'],
            'buligs_13_weeks' => $payload['buligs_13_weeks'],
            'buligs_14_weeks' => $payload['buligs_14_weeks'],
            'total_buligs' => $payload['total_buligs'],
            'updated_at' => now(),
        ];

        if ($creating) {
            $values['created_by'] = $payload['user_id'] ?? null;
            $values['created_at'] = now();
        }

        return $values;
    }

    private function recordAudit(?int $userId, ?string $userName, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

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
}
