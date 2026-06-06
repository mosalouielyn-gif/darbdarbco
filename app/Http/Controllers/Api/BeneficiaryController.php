<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class BeneficiaryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);
        $id = DB::table('beneficiaries')->insertGetId($this->values($payload, true));
        $beneficiary = $this->findBeneficiary($id);
        $this->recordAudit($payload, 'Created', "Created beneficiary {$beneficiary->name}");

        return response()->json($beneficiary, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_if(! DB::table('beneficiaries')->where('id', $id)->exists(), 404, 'Beneficiary not found.');

        $payload = $this->validatedPayload($request, $id);
        DB::table('beneficiaries')->where('id', $id)->update($this->values($payload, false));
        $beneficiary = $this->findBeneficiary($id);
        $this->recordAudit($payload, 'Updated', "Updated beneficiary {$beneficiary->name}");

        return response()->json($beneficiary);
    }

    public function status(Request $request, int $id): JsonResponse
    {
        abort_if(! DB::table('beneficiaries')->where('id', $id)->exists(), 404, 'Beneficiary not found.');

        $payload = $request->validate([
            'active' => ['required', 'boolean'],
            'admin_id' => ['nullable', 'integer'],
            'admin_name' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        DB::table('beneficiaries')->where('id', $id)->update($this->withUpdatedTimestamp([
            $this->activeColumn() => $payload['active'],
        ]));

        $beneficiary = $this->findBeneficiary($id);
        $action = $payload['active'] ? 'Activated' : 'Deactivated';
        $this->recordAudit($payload, $action, "{$action} beneficiary {$beneficiary->name}");

        return response()->json($beneficiary);
    }

    private function validatedPayload(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'code' => ['nullable', 'string', 'max:255', Rule::unique('beneficiaries', $this->codeColumn())->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'active' => ['required', 'boolean'],
            'admin_id' => ['nullable', 'integer'],
            'admin_name' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);
    }

    private function values(array $payload, bool $creating): array
    {
        $values = [
            $this->nameColumn() => $payload['name'],
            $this->activeColumn() => $payload['active'],
        ];

        $values = $this->withUpdatedTimestamp($values);

        if (Schema::hasColumn('beneficiaries', $this->codeColumn())) {
            $values[$this->codeColumn()] = $payload['code'] ?: $this->nextCode();
        }

        $contactColumn = $this->contactColumn();
        if ($contactColumn) {
            $values[$contactColumn] = $payload['contact_number'] ?? null;
        }

        if (Schema::hasColumn('beneficiaries', 'address')) {
            $values['address'] = $payload['address'] ?? null;
        }

        if ($creating && Schema::hasColumn('beneficiaries', 'created_at')) {
            $values['created_at'] = now();
        }

        return $values;
    }

    private function findBeneficiary(int $id): object
    {
        $select = [
            'id',
            DB::raw($this->codeColumn().' as code'),
            DB::raw($this->nameColumn().' as name'),
            DB::raw($this->activeColumn().' as active'),
        ];

        if (Schema::hasColumn('beneficiaries', 'created_at')) {
            $select[] = 'created_at';
        } else {
            $select[] = DB::raw('null as created_at');
        }

        if (Schema::hasColumn('beneficiaries', 'updated_at')) {
            $select[] = 'updated_at';
        } else {
            $select[] = DB::raw('null as updated_at');
        }

        $contactColumn = $this->contactColumn();
        if ($contactColumn) {
            $select[] = DB::raw($contactColumn.' as contact_number');
        }
        if (Schema::hasColumn('beneficiaries', 'address')) {
            $select[] = 'address';
        }

        return DB::table('beneficiaries')->select($select)->where('id', $id)->first();
    }

    private function nextCode(): string
    {
        return 'BEN-'.now()->format('YmdHis');
    }

    private function nameColumn(): string
    {
        return Schema::hasColumn('beneficiaries', 'full_name') ? 'full_name' : 'name';
    }

    private function codeColumn(): string
    {
        return Schema::hasColumn('beneficiaries', 'code') ? 'code' : 'beneficiary_code';
    }

    private function activeColumn(): string
    {
        return Schema::hasColumn('beneficiaries', 'is_active') ? 'is_active' : 'active';
    }

    private function contactColumn(): ?string
    {
        foreach (['contact_number', 'contact_no', 'contact', 'phone', 'mobile_number'] as $column) {
            if (Schema::hasColumn('beneficiaries', $column)) {
                return $column;
            }
        }

        return null;
    }

    private function withUpdatedTimestamp(array $values): array
    {
        if (Schema::hasColumn('beneficiaries', 'updated_at')) {
            $values['updated_at'] = now();
        }

        return $values;
    }

    private function recordAudit(array $payload, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $values = ['module' => 'Beneficiaries', 'action' => $action];

        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $values['user_id'] = $payload['admin_id'] ?? null;
        }
        if (Schema::hasColumn('audit_logs', 'user_name')) {
            $values['user_name'] = $payload['admin_name'] ?? null;
        }
        if (Schema::hasColumn('audit_logs', 'description')) {
            $values['description'] = $payload['remarks'] ?? $description;
        }
        if (Schema::hasColumn('audit_logs', 'details')) {
            $values['details'] = $payload['remarks'] ?? $description;
        }
        if (Schema::hasColumn('audit_logs', 'status')) {
            $values['status'] = 'Completed';
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
