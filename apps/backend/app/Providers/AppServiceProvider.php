<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\ResponseFactory;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerResponseMacros();
        $this->configureRateLimiting();
    }

    /**
     * Register API response envelope macros.
     *
     * All API responses follow the consistent JSON envelope:
     * { success: bool, data: ..., error: ... }
     */
    private function registerResponseMacros(): void
    {
        /** @var ResponseFactory $factory */
        $factory = $this->app->make(ResponseFactory::class);

        $factory->macro('success', function (mixed $data = null, int $status = 200, string $message = ''): JsonResponse {
            $payload = ['success' => true, 'data' => $data];

            if ($message !== '') {
                $payload['message'] = $message;
            }

            return response()->json($payload, $status);
        });

        $factory->macro('error', function (string $message, string $code, int $status = 400, mixed $details = null): JsonResponse {
            $error = ['message' => $message, 'code' => $code];

            if ($details !== null) {
                $error['details'] = $details;
            }

            return response()->json(['success' => false, 'error' => $error], $status);
        });

        $factory->macro('paginated', function (LengthAwarePaginator $paginator): JsonResponse {
            return response()->json([
                'success' => true,
                'data' => [
                    'data' => $paginator->items(),
                    'links' => [
                        'first' => $paginator->url(1),
                        'last' => $paginator->url($paginator->lastPage()),
                        'prev' => $paginator->previousPageUrl(),
                        'next' => $paginator->nextPageUrl(),
                    ],
                    'meta' => [
                        'current_page' => $paginator->currentPage(),
                        'from' => $paginator->firstItem(),
                        'last_page' => $paginator->lastPage(),
                        'per_page' => $paginator->perPage(),
                        'to' => $paginator->lastItem(),
                        'total' => $paginator->total(),
                    ],
                ],
            ]);
        });
    }

    /**
     * Configure rate limiting for authentication endpoints.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('auth', function (Request $request): Limit {
            return Limit::perMinute(60)->by($request->ip());
        });
    }
}
