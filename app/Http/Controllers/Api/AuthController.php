<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        $password = $credentials['password'];

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

        if (! Auth::guard('web')->loginUsingId((int) $user->id)) {
            throw ValidationException::withMessages([
                'email' => ['Unable to start an authenticated session for this account.'],
            ]);
        }

        $request->session()->regenerate();

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

    public function session(Request $request): JsonResponse
    {
        $authenticatedUser = $request->user();
        $user = $authenticatedUser
            ? $this->findUserById((int) $authenticatedUser->getAuthIdentifier())
            : null;

        if (! $user || ! $user->active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            abort(401, 'Your session is no longer valid. Please sign in again.');
        }

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'csrf_token' => $request->session()->token(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'ok' => true,
            'csrf_token' => $request->session()->token(),
        ]);
    }

    public function verifyAdminPassword(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $authenticatedUser = $request->user();
        abort_unless($authenticatedUser, 401, 'Authentication is required.');

        $user = $this->findUserById((int) $authenticatedUser->getAuthIdentifier());
        $email = strtolower(trim($credentials['email']));

        if (
            ! $user ||
            strtolower($user->email) !== $email ||
            $user->role !== 'manager_admin' ||
            ! $user->active ||
            ! $this->passwordMatches($credentials['password'], $user->password_hash)
        ) {
            throw ValidationException::withMessages([
                'password' => ['Admin password verification failed.'],
            ]);
        }

        return response()->json(['verified' => true]);
    }

    private function findUserById(int $id): ?object
    {
        return $this->usersQuery()?->where('users.id', $id)->first();
    }

    private function findUserByEmail(string $email): ?object
    {
        return $this->usersQuery()
            ?->whereRaw('lower(users.email) = ?', [$email])
            ->first();
    }

    private function usersQuery(): ?Builder
    {
        if (! Schema::hasTable('users')) {
            return null;
        }

        $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
        $passwordColumn = Schema::hasColumn('users', 'password_hash') ? 'password_hash' : 'password';

        if (! Schema::hasColumn('users', $nameColumn) || ! Schema::hasColumn('users', $passwordColumn)) {
            return null;
        }

        $query = DB::table('users as users');
        $roleSelect = DB::raw("'production_clerk' as role");

        if (Schema::hasColumn('users', 'role_id') && Schema::hasTable('roles')) {
            $query->leftJoin('roles', 'roles.id', '=', 'users.role_id');
            $roleSelect = DB::raw('roles.code as role');
        } elseif (Schema::hasColumn('users', 'role')) {
            $roleSelect = DB::raw('users.role as role');
        }

        return $query->select([
            'users.id',
            DB::raw("users.{$nameColumn} as name"),
            'users.email',
            DB::raw("users.{$passwordColumn} as password_hash"),
            $roleSelect,
            Schema::hasColumn('users', 'is_active')
                ? DB::raw('users.is_active as active')
                : (Schema::hasColumn('users', 'active') ? DB::raw('users.active as active') : DB::raw('true as active')),
        ]);
    }

    private function markLastLogin(int $userId): void
    {
        app()->terminating(function () use ($userId) {
            try {
                DB::table('users')->where('id', $userId)->update(['last_login_at' => now()]);
            } catch (QueryException) {
                // Older schemas may not have last_login_at; login should still succeed.
            }
        });
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
}
