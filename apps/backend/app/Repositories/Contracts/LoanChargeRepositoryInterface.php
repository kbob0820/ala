<?php

namespace App\Repositories\Contracts;

use App\Models\LoanCharge;
use Illuminate\Database\Eloquent\Collection;

interface LoanChargeRepositoryInterface
{
    /** @param array<string, mixed> $data */
    public function create(array $data): LoanCharge;

    public function find(int $id): ?LoanCharge;

    /** @return Collection<int, LoanCharge> */
    public function findByLoan(int $loanId): Collection;

    /** @return Collection<int, LoanCharge> */
    public function unpaidForLoan(int $loanId): Collection;

    public function hasActiveLateFeeForInstallment(int $installmentId): bool;
}
