<?php

namespace App\Repositories\Contracts;

use App\Models\Setting;
use Illuminate\Database\Eloquent\Collection;

interface SettingRepositoryInterface
{
    /** @return Collection<int, Setting> */
    public function all(): Collection;

    public function get(string $key, ?string $default = null): ?string;

    public function set(string $key, string $value, string $group = 'general', ?int $userId = null): Setting;
}
