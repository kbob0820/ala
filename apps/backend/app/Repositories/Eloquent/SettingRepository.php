<?php

namespace App\Repositories\Eloquent;

use App\Models\Setting;
use App\Repositories\Contracts\SettingRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class SettingRepository implements SettingRepositoryInterface
{
    public function all(): Collection
    {
        return Setting::all();
    }

    public function get(string $key, ?string $default = null): ?string
    {
        $setting = Setting::where('key', $key)->first();

        return $setting ? $setting->value : $default;
    }

    public function set(string $key, string $value, string $group = 'general', ?int $userId = null): Setting
    {
        $setting = Setting::where('key', $key)->first();

        if ($setting) {
            $setting->update([
                'value' => $value,
                'group' => $group,
                'updated_by' => $userId,
            ]);

            return $setting;
        }

        return Setting::create([
            'key' => $key,
            'value' => $value,
            'group' => $group,
            'updated_by' => $userId,
        ]);
    }
}
