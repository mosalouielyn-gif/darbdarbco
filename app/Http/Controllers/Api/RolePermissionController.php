<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RolePermissionController extends Controller
{
    private const DEFAULTS = [
        'manager_admin' => ['Dashboard (View)', 'Payroll (Approve)', 'Restock (Approve)', 'Production (View)', 'Inventory (View)', 'Reports (View)', 'Audit Logs (View)', 'User Management', 'Role Access', 'System Settings'],
        'finance_officer' => ['Dashboard (View)', 'Payroll (Validate)', 'Payroll History (View)', 'Reports (View)', 'Audit Logs (View)'],
        'payroll_personnel' => ['Dashboard (View)', 'Payroll (Prepare)', 'Payroll History (View)', 'Production (View)', 'Credit Transactions (View)'],
        'inventory_bookkeeper' => ['Dashboard (View)', 'Inventory (Manage)', 'Stock History (View)', 'Credit Transactions (Manage)', 'Restock (Request)'],
        'production_clerk' => ['Dashboard (View)', 'Production (Encode)', 'Production Records (View)'],
    ];

    public function index(): JsonResponse
    {
        $this->ensureDefaults();

        return response()->json(DB::table('role_permissions')->orderBy('role')->orderBy('permission')->get()->all());
    }

    public function update(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'role' => ['required', 'string', 'max:255'],
            'permissions' => ['required', 'array'],
            'permissions.*.permission' => ['required', 'string', 'max:255'],
            'permissions.*.allowed' => ['required', 'boolean'],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($payload['permissions'] as $permission) {
            DB::table('role_permissions')->updateOrInsert(
                ['role' => $payload['role'], 'permission' => $permission['permission']],
                ['allowed' => $permission['allowed'], 'updated_at' => now(), 'created_at' => now()]
            );
        }

        $this->recordAudit($payload['user_id'] ?? null, $payload['user_name'] ?? null, "Updated role access for {$payload['role']}");

        return $this->index();
    }

    private function ensureDefaults(): void
    {
        if (! Schema::hasTable('role_permissions')) {
            return;
        }

        foreach (self::DEFAULTS as $role => $permissions) {
            foreach ($permissions as $permission) {
                DB::table('role_permissions')->updateOrInsert(
                    ['role' => $role, 'permission' => $permission],
                    ['allowed' => true, 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }
    }

    private function recordAudit(?int $userId, ?string $userName, string $description): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $values = ['module' => 'Settings', 'action' => 'Updated'];
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
}
