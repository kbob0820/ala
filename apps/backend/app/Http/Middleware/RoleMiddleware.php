<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        if (! $user->isActive()) {
            return response()->error('Account is deactivated.', 'ACCOUNT_DEACTIVATED', 403);
        }

        foreach ($roles as $role) {
            if ($user->hasRole(UserRole::from($role))) {
                return $next($request);
            }
        }

        return response()->error('Access denied. Required role not met.', 'FORBIDDEN', 403);
    }
}
