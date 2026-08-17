<?php

namespace App\Services;

use App\Repositories\Contracts\SettingRepositoryInterface;

class SettingsService
{
    public const KEY_LATE_FEE_AMOUNT = 'late_fee_amount';

    public const KEY_LATE_FEE_GRACE_DAYS = 'late_fee_grace_days';

    public function __construct(
        private readonly SettingRepositoryInterface $settingRepository,
    ) {}

    public function get(string $key, ?string $default = null): ?string
    {
        return $this->settingRepository->get($key, $default);
    }

    public function set(string $key, string $value, string $group = 'loans', ?int $userId = null): void
    {
        $this->settingRepository->set($key, $value, $group, $userId);
    }

    public function lateFeeAmount(): float
    {
        $value = $this->get(self::KEY_LATE_FEE_AMOUNT);

        return $value !== null
            ? (float) $value
            : (float) config('loans.late_fee_amount', 500);
    }

    public function lateFeeGraceDays(): int
    {
        $value = $this->get(self::KEY_LATE_FEE_GRACE_DAYS);

        return $value !== null
            ? (int) $value
            : (int) config('loans.late_fee_grace_days', 0);
    }
}
