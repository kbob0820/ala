<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthCheckController extends Controller
{
    /**
     * Handle the incoming health-check request.
     */
    public function __invoke(): JsonResponse
    {
        $databaseStatus = $this->checkDatabase();

        return response()->success([
            'status' => $databaseStatus === 'connected' ? 'healthy' : 'degraded',
            'app' => 'laravel',
            'version' => '12.x',
            'database' => $databaseStatus,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Check database connectivity.
     */
    private function checkDatabase(): string
    {
        try {
            DB::connection()->getPdo();

            return 'connected';
        } catch (Throwable) {
            return 'disconnected';
        }
    }
}
