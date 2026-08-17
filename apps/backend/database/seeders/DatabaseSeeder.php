<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedRoles();
        $this->seedAdminUser();
    }

    private function seedRoles(): void
    {
        foreach (UserRole::seedData() as $data) {
            Role::firstOrCreate(['slug' => $data['slug']], $data);
        }
    }

    private function seedAdminUser(): void
    {
        $adminRole = Role::where('slug', UserRole::Administrator->value)->first();

        if ($adminRole && ! User::where('email', 'admin@ajang.local')->exists()) {
            User::create([
                'name' => 'System Administrator',
                'email' => 'admin@ajang.local',
                'password' => 'password',
                'role_id' => $adminRole->id,
                'is_active' => true,
            ]);
        }
    }
}
