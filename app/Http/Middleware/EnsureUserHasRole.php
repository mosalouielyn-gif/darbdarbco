<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $authenticatedUser = $request->user();
        abort_unless($authenticatedUser, 401, 'Authentication is required.');

        if (! Schema::hasTable('users')) {
            abort(403, 'User authorization could not be verified.');
        }

        $query = DB::table('users as users')
            ->where('users.id', $authenticatedUser->getAuthIdentifier());

        if (Schema::hasColumn('users', 'role_id') && Schema::hasTable('roles')) {
            $query->leftJoin('roles', 'roles.id', '=', 'users.role_id');
            $roleSelect = 'roles.code as role';
        } elseif (Schema::hasColumn('users', 'role')) {
            $roleSelect = 'users.role as role';
        } else {
            abort(403, 'User authorization could not be verified.');
        }

        if (Schema::hasColumn('users', 'is_active')) {
            $activeSelect = 'users.is_active as active';
        } elseif (Schema::hasColumn('users', 'active')) {
            $activeSelect = 'users.active as active';
        } else {
            abort(403, 'User account status could not be verified.');
        }

        $nameColumn = Schema::hasColumn('users', 'full_name') ? 'full_name' : 'name';
        abort_unless(Schema::hasColumn('users', $nameColumn), 403, 'User identity could not be verified.');

        $query->selectRaw("users.id, users.{$nameColumn} as authenticated_name, {$roleSelect}, {$activeSelect}");
        $account = $query->first();

        abort_unless($account && (bool) $account->active, 403, 'This account is inactive.');

        $allowedRoles = array_filter(array_map('trim', $roles));
        abort_unless(in_array($account->role, $allowedRoles, true), 403, 'Your account is not authorized to perform this action.');

        $request->attributes->set('authenticated_role', $account->role);
        $actorName = (string) $account->authenticated_name;
        $request->merge([
            'user_id' => (int) $account->id,
            'user_name' => $actorName,
            'admin_id' => (int) $account->id,
            'admin_name' => $actorName,
        ]);

        return $next($request);
    }
}
