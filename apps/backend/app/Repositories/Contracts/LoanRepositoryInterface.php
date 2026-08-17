<?php

namespace App\Repositories\Contracts;

use App\Models\Loan;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface LoanRepositoryInterface
{
    /** @return LengthAwarePaginator<Loan> */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    public function find(int $id): ?Loan;

    /** @param array<string, mixed> $data */
    public function create(array $data): Loan;

    /** @param array<string, mixed> $data */
    public function update(Loan $loan, array $data): Loan;

    public function delete(Loan $loan): bool;

    /** @return Collection<int, Loan> */
    public function findActiveForClient(int $clientId): Collection;
}
