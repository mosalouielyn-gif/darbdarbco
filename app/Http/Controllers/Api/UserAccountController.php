<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class UserAccountController extends Controller
{
    private const ROLES = [
        'production_clerk',
        'inventory_bookkeeper',
        'payroll_personnel',
        'finance_officer',
        'manager_admin',
        'harvester',
    ];

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'string', Rule::in(self::ROLES)],
            'active' => ['required', 'boolean'],
            'contact' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
            'admin_id' => ['nullable', 'integer'],
            'admin_name' => ['nullable', 'string', 'max:255'],
        ]);

        $id = DB::table('users')->insertGetId($this->userValues($payload, creating: true));

        $account = $this->findUser($id);
        $payload['admin_id'] ??= $id;
        $this->recordAudit($payload, 'Created', "Created user account {$account->name}");

        return response()->json($account, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
            'username' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', Rule::in(self::ROLES)],
            'active' => ['required', 'boolean'],
            'contact' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
            'admin_id' => ['nullable', 'integer'],
            'admin_name' => ['nullable', 'string', 'max:255'],
        ]);

        DB::table('users')->where('id', $id)->update($this->userValues($payload, creating: false));

        $account = $this->findUser($id);
        $payload['admin_id'] ??= $id;
        $this->recordAudit($payload, 'Updated', "Updated user account {$account->name}");

        return response()->json($account);
    }

    public function status(Request $request, int $id): JsonResponse
    {
        $payload = $request->validate([
            'active' => ['required', 'boolean'],
            'admin_id' => ['nullable', 'integer'],
            'admin_name' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        $column = $this->activeColumn();
        DB::table('users')->where('id', $id)->update([
            $column => $payload['active'],
            'updated_at' => now(),
        ]);

        $account = $this->findUser($id);
        $action = $payload['active'] ? 'Activated' : 'Deactivated';
        $payload['admin_id'] ??= $id;
        $this->recordAudit($payload, $action, "{$action} user account {$account->name}");

        return response()->json($account);
    }

    private function userValues(array $payload, bool $creating): array
    {
        $values = [
            $this->nameColumn() => $payload['name'],
            'email' => strtolower(trim($payload['email'])),
            $this->activeColumn() => $payload['active'],
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('users', 'username')) {
            $values['username'] = $payload['username'];
        }

        if (Schema::hasColumn('users', 'role_id')) {
            $values['role_id'] = $this->roleId($payload['role']);
        } elseif (Schema::hasColumn('users', 'role')) {
            $values['role'] = $payload['role'];
        }

        if (Schema::hasColumn('users', 'contact_information')) {
            $values['contact_information'] = $payload['contact'] ?? null;
        }

        if (Schema::hasColumn('users', 'remarks')) {
            $values['remarks'] = $payload['remarks'] ?? null;
        }

        if ($creating) {
            $values[$this->passwordColumn()] = Hash::make($payload['password']);
            $values['created_at'] = now();
        }

        return $values;
    }

    private function findUser(int $id): object
    {
        $query = DB::table('users')->where('users.id', $id);

        if (Schema::hasColumn('users', 'role_id') && Schema::hasTable('roles')) {
            $query->leftJoin('roles', 'roles.id', '=', 'users.role_id');
            $roleSelect = DB::raw('roles.code as role');
        } else {
            $roleSelect = Schema::hasColumn('users', 'role') ? DB::raw('users.role as role') : DB::raw("'production_clerk' as role");
        }

        $select = [
            'users.id',
            DB::raw('users.'.$this->nameColumn().' as name'),
            'users.email',
            $roleSelect,
            DB::raw('users.'.$this->activeColumn().' as active'),
            'users.last_login_at',
        ];

        if (Schema::hasColumn('users', 'username')) {
            $select[] = 'users.username';
        }

        if (Schema::hasColumn('users', 'contact_information')) {
            $select[] = 'users.contact_information';
        }

        if (Schema::hasColumn('users', 'remarks')) {
            $select[] = 'users.remarks';
        }

        return $query->select($select)->first();
    }

    private function roleId(string $role): ?int
    {
        if (! Schema::hasTable('roles')) {
            return null;
        }

        $existing = DB::table('roles')->where('code', $role)->value('id');
        if ($existing) {
            return (int) $existing;
        }

        $values = [];
        if (Schema::hasColumn('roles', 'code')) {
            $values['code'] = $role;
        }
        if (Schema::hasColumn('roles', 'label')) {
            $values['label'] = ucwords(str_replace('_', ' ', $role));
        } elseif (Schema::hasColumn('roles', 'name')) {
            $values['name'] = ucwords(str_replace('_', ' ', $role));
        }
        if (Schema::hasColumn('roles', 'created_at')) {
            $values['created_at'] = now();
        }
        if (Schema::hasColumn('roles', 'updated_at')) {
            $values['updated_at'] = now();
        }

        return empty($values) ? null : (int) DB::table('roles')->insertGetId($values);
    }

    private function nameColumn(): string
    {
        return Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
    }

    private function passwordColumn(): string
    {
        return Schema::hasColumn('users', 'password_hash') ? 'password_hash' : 'password';
    }

    private function activeColumn(): string
    {
        return Schema::hasColumn('users', 'is_active') ? 'is_active' : 'active';
    }

    private function recordAudit(array $payload, string $action, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $values = [
            'module' => 'Users',
            'action' => $action,
        ];

        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $values['user_id'] = $payload['admin_id'];
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
