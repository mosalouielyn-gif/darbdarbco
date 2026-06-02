<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($credentials['email']));
        $password = trim($credentials['password']);

        $user = $this->findUserByEmail($email);

        if (! $user || ! $this->passwordMatches($password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if (! $user->active) {
            throw ValidationException::withMessages([
                'email' => ['This account is inactive.'],
            ]);
        }

        $this->markLastLogin((int) $user->id);

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    private function findUserByEmail(string $email): ?object
    {
        if ($this->usesExistingDarbcoSchema()) {
            return DB::table('users')
                ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                ->whereRaw('lower(users.email) = ?', [$email])
                ->selectRaw('users.id, users.full_name as name, users.email, users.password_hash, roles.code as role, users.is_active as active')
                ->first();
        }

        if (! Schema::hasColumn('users', 'password')) {
            return null;
        }

        return DB::table('users')
            ->whereRaw('lower(email) = ?', [$email])
            ->selectRaw('id, name, email, password as password_hash, role, active')
            ->first();
    }

    private function markLastLogin(int $userId): void
    {
        if (! Schema::hasColumn('users', 'last_login_at')) {
            return;
        }

        DB::table('users')->where('id', $userId)->update(['last_login_at' => now()]);
    }

    private function passwordMatches(string $password, string $hash): bool
    {
        try {
            if (Hash::check($password, $hash)) {
                return true;
            }
        } catch (\RuntimeException) {
            return password_verify($password, $hash);
        }

        return password_verify($password, $hash);
    }

    private function usesExistingDarbcoSchema(): bool
    {
        return Schema::hasTable('roles')
            && Schema::hasColumn('users', 'full_name')
            && Schema::hasColumn('users', 'password_hash')
            && Schema::hasColumn('users', 'role_id');
    }
}
