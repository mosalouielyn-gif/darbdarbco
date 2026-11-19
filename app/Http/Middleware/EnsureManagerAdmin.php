<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class EnsureManagerAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $authenticatedUser = $request->user();
        abort_unless($authenticatedUser, 401, 'Authentication is required.');

        if (! Schema::hasTable('users')) {
            abort(403, 'Manager/Admin authorization could not be verified.');
        }

        $query = DB::table('users as users')
            ->where('users.id', $authenticatedUser->getAuthIdentifier());

        if (Schema::hasColumn('users', 'role_id') && Schema::hasTable('roles')) {
            $query->leftJoin('roles', 'roles.id', '=', 'users.role_id');
            $roleSelect = 'roles.code as role';
        } elseif (Schema::hasColumn('users', 'role')) {
            $roleSelect = 'users.role as role';
        } else {
            abort(403, 'Manager/Admin authorization could not be verified.');
        }

        if (Schema::hasColumn('users', 'is_active')) {
            $activeSelect = 'users.is_active as active';
        } elseif (Schema::hasColumn('users', 'active')) {
            $activeSelect = 'users.active as active';
        } else {
            $activeSelect = null;
        }

        $query->selectRaw($roleSelect);
        if ($activeSelect) {
            $query->selectRaw($activeSelect);
        }

        $account = $query->first();

        abort_unless(
            $account && $account->role === 'manager_admin' && ($activeSelect === null || (bool) $account->active),
            403,
            'Only an active Manager/Admin can approve payroll slips.',
        );

        return $next($request);
    }
}
