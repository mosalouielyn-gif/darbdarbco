<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class DatabaseMaintenanceController extends Controller
{
    private const PROTECTED_USER_IDS = [11, 12, 13, 14, 15];

    private const PROTECTED_USER_EMAILS = [
        'clerk@darbco.coop',
        'inventory@darbco.coop',
        'payroll@darbco.coop',
        'finance@darbco.coop',
        'admin@darbco.coop',
    ];

    private const PROTECTED_USERNAMES = [
        'maria.santos',
        'jose.reyes',
        'ana.delacruz',
        'pedro.mendoza',
        'cecilia.aquino',
    ];

    private const PROTECTED_TABLES = [
        'migrations',
        'roles',
        'role_permissions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'password_reset_tokens',
        'personal_access_tokens',
    ];

    public function index(): JsonResponse
    {
        return response()->json([
            'tables' => $this->tables(),
            'protected_users' => self::PROTECTED_USER_IDS,
        ]);
    }

    public function destroy(Request $request, string $table): JsonResponse
    {
        $tables = collect($this->tables())->pluck('name')->all();

        $payload = $request->validate([
            'confirmation' => ['required', Rule::in([$this->confirmationText($table)])],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        abort_if(! in_array($table, $tables, true), 404, 'Table is not available for cleanup.');

        try {
            $deleted = DB::transaction(function () use ($table, $payload) {
                $deleted = $table === 'users'
                    ? $this->deleteNonProtectedUsers()
                    : DB::table($table)->delete();

                $this->recordAudit(
                    $payload['user_id'] ?? null,
                    $payload['user_name'] ?? 'Manager / Admin',
                    "Deleted {$deleted} record(s) from {$table}.",
                );

                return $deleted;
            });
        } catch (QueryException $error) {
            return response()->json([
                'message' => 'Unable to delete this table. Delete related child records first, then try again.',
                'error' => $error->getMessage(),
            ], 409);
        }

        return response()->json([
            'table' => $table,
            'deleted' => $deleted,
            'remaining' => $this->tableCount($table),
        ]);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'confirmation' => ['required', Rule::in(['DELETE ALL DATABASE DATA'])],
            'user_id' => ['nullable', 'integer'],
            'user_name' => ['nullable', 'string', 'max:255'],
        ]);

        $tables = collect($this->tables())
            ->pluck('name')
            ->reject(fn ($table) => $table === 'users')
            ->values()
            ->all();

        $estimatedDeleted = collect($tables)->sum(fn ($table) => $this->tableCount($table)) + $this->deletableUserCount();

        try {
            DB::transaction(function () use ($tables, $payload) {
                if (count($tables) > 0) {
                    $quotedTables = collect($tables)
                        ->map(fn ($table) => '"' . str_replace('"', '""', $table) . '"')
                        ->implode(', ');

                    DB::statement("TRUNCATE TABLE {$quotedTables} RESTART IDENTITY CASCADE");
                }

                $deletedUsers = $this->deleteNonProtectedUsers();

                $this->recordAudit(
                    $payload['user_id'] ?? null,
                    $payload['user_name'] ?? 'Manager / Admin',
                    "Deleted all database cleanup data. Non-core users deleted: {$deletedUsers}. Core system accounts were preserved.",
                );
            });
        } catch (QueryException $error) {
            return response()->json([
                'message' => 'Unable to delete all database data.',
                'error' => $error->getMessage(),
            ], 409);
        }

        return response()->json([
            'deleted' => $estimatedDeleted,
            'tables' => $this->tables(),
        ]);
    }

    private function tables(): array
    {
        return collect(DB::select("
                select table_name
                from information_schema.tables
                where table_schema = 'public'
                  and table_type = 'BASE TABLE'
                order by table_name
            "))
            ->pluck('table_name')
            ->filter(fn ($table) => ! in_array($table, self::PROTECTED_TABLES, true))
            ->filter(fn ($table) => Schema::hasTable($table))
            ->map(fn ($table) => [
                'name' => $table,
                'label' => $this->label($table),
                'records' => $this->tableCount($table),
                'deletable_records' => $table === 'users' ? $this->deletableUserCount() : $this->tableCount($table),
                'protected' => $table === 'users',
                'confirmation' => $this->confirmationText($table),
                'note' => $table === 'users'
                    ? 'Deletes only non-core user accounts. The five default system accounts are preserved.'
                    : 'Deletes all records in this table only.',
            ])
            ->values()
            ->all();
    }

    private function deleteNonProtectedUsers(): int
    {
        $query = DB::table('users');

        if (Schema::hasColumn('users', 'id')) {
            $query->whereNotIn('id', self::PROTECTED_USER_IDS);
        }

        if (Schema::hasColumn('users', 'email')) {
            $placeholders = implode(',', array_fill(0, count(self::PROTECTED_USER_EMAILS), '?'));
            $query->whereRaw("lower(email) not in ({$placeholders})", self::PROTECTED_USER_EMAILS);
        }

        if (Schema::hasColumn('users', 'username')) {
            $placeholders = implode(',', array_fill(0, count(self::PROTECTED_USERNAMES), '?'));
            $query->whereRaw("lower(username) not in ({$placeholders})", self::PROTECTED_USERNAMES);
        }

        return $query->delete();
    }

    private function deletableUserCount(): int
    {
        if (! Schema::hasTable('users')) {
            return 0;
        }

        $query = DB::table('users');

        if (Schema::hasColumn('users', 'id')) {
            $query->whereNotIn('id', self::PROTECTED_USER_IDS);
        }

        if (Schema::hasColumn('users', 'email')) {
            $placeholders = implode(',', array_fill(0, count(self::PROTECTED_USER_EMAILS), '?'));
            $query->whereRaw("lower(email) not in ({$placeholders})", self::PROTECTED_USER_EMAILS);
        }

        if (Schema::hasColumn('users', 'username')) {
            $placeholders = implode(',', array_fill(0, count(self::PROTECTED_USERNAMES), '?'));
            $query->whereRaw("lower(username) not in ({$placeholders})", self::PROTECTED_USERNAMES);
        }

        return (int) $query->count();
    }

    private function tableCount(string $table): int
    {
        return Schema::hasTable($table) ? (int) DB::table($table)->count() : 0;
    }

    private function confirmationText(string $table): string
    {
        return $table === 'users' ? 'DELETE NON-CORE USERS' : 'DELETE ' . strtoupper($table);
    }

    private function label(string $table): string
    {
        return collect(explode('_', $table))
            ->map(fn ($part) => ucfirst($part))
            ->implode(' ');
    }

    private function recordAudit(?int $userId, string $userName, string $details): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $values = [
            'module' => 'Database Maintenance',
            'action' => 'Deleted',
            'details' => $details,
        ];

        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $values['user_id'] = $userId;
        }

        if (Schema::hasColumn('audit_logs', 'user_name')) {
            $values['user_name'] = $userName;
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
