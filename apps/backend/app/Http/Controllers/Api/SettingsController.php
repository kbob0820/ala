<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(
        private readonly SettingsService $settingsService,
    ) {}

    public function index(): JsonResponse
    {
        return response()->success([
            'late_fee_amount' => $this->settingsService->lateFeeAmount(),
            'late_fee_grace_days' => $this->settingsService->lateFeeGraceDays(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'late_fee_amount' => ['nullable', 'numeric', 'min:0'],
            'late_fee_grace_days' => ['nullable', 'integer', 'min:0'],
        ]);

        $userId = $request->user()?->id;

        if (array_key_exists('late_fee_amount', $data)) {
            $this->settingsService->set(
                SettingsService::KEY_LATE_FEE_AMOUNT,
                (string) $data['late_fee_amount'],
                'loans',
                $userId,
            );
        }

        if (array_key_exists('late_fee_grace_days', $data)) {
            $this->settingsService->set(
                SettingsService::KEY_LATE_FEE_GRACE_DAYS,
                (string) $data['late_fee_grace_days'],
                'loans',
                $userId,
            );
        }

        return $this->index();
    }
}
