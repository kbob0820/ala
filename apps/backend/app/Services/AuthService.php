<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;

class AuthService extends BaseService
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        AuditService $auditService,
    ) {
        parent::__construct($auditService);
    }

    /** @param array<string, mixed> $data */
    public function register(array $data): array
    {
        $user = $this->userRepository->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role_id' => $data['role_id'] ?? null,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        $user->load('role');

        $this->auditService->log('registered', 'App\\Models\\User', $user->id, null, [
            'name' => $user->name,
            'email' => $user->email,
        ]);

        return ['user' => $user, 'token' => $token];
    }

    /** @param array{email: string, password: string} $credentials */
    public function login(array $credentials): ?array
    {
        $user = $this->userRepository->findByEmail($credentials['email']);

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return null;
        }

        if (! $user->isActive()) {
            return null;
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    public function getCurrentUser(User $user): User
    {
        return $user->load('role');
    }
}
