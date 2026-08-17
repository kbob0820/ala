<?php

namespace App\Repositories\Contracts;

use App\Models\Refund;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface RefundRepositoryInterface
{
    /** @param array<string, mixed> $data */
    public function create(array $data): Refund;

    public function find(int $id): ?Refund;

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Refund>
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;
}
