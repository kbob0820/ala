<?php

namespace App\Repositories\Contracts;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface UserRepositoryInterface
{
    /** @return LengthAwarePaginator<User> */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    public function find(int $id): ?User;

    public function findByEmail(string $email): ?User;

    /** @param array<string, mixed> $data */
    public function create(array $data): User;

    /** @param array<string, mixed> $data */
    public function update(User $user, array $data): User;

    public function delete(User $user): bool;
}
