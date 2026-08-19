<?php

use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;


return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->alias([
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
            'role' => RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $e, Request $request): ?JsonResponse {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->error('Unauthenticated.', 'UNAUTHENTICATED', 401);
            }

            return null;
        });

        $exceptions->render(function (ValidationException $e, Request $request): ?JsonResponse {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
            }

            return null;
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request): ?JsonResponse {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->error('Resource not found.', 'NOT_FOUND', 404);
            }

            return null;
        });

        $exceptions->render(function (QueryException $e, Request $request): ?JsonResponse {
            if ($request->is('api/*') || $request->expectsJson()) {
                if (app()->hasDebugModeEnabled()) {
                    return response()->error($e->getMessage(), 'DATABASE_ERROR', 500);
                }

                return response()->error('A database error occurred. Please try again later.', 'DATABASE_ERROR', 500);
            }

            return null;
        });

        $exceptions->render(function (Throwable $e, Request $request): ?JsonResponse {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
                $status = is_int($status) && $status >= 400 && $status < 600 ? $status : 500;

                if (app()->hasDebugModeEnabled()) {
                    return response()->error($e->getMessage(), 'SERVER_ERROR', $status);
                }

                return response()->error('An unexpected error occurred.', 'SERVER_ERROR', $status);
            }

            return null;
        });
    })->create();
