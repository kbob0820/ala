<?php

namespace App\Repositories\Contracts;

use App\Models\Client;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ClientRepositoryInterface
{
    /** @return LengthAwarePaginator<Client> */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    public function find(int $id): ?Client;

    /** @param array<string, mixed> $data */
    public function create(array $data): Client;

    /** @param array<string, mixed> $data */
    public function update(Client $client, array $data): Client;

    public function delete(Client $client): bool;
}
