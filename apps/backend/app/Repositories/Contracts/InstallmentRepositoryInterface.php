<?php

namespace App\Repositories\Contracts;

use App\Models\LoanInstallment;
use Illuminate\Database\Eloquent\Collection;

interface InstallmentRepositoryInterface
{
    /** @param array<string, mixed> $data */
    public function create(array $data): LoanInstallment;

    /** @param array<string, mixed> $data */
    public function update(LoanInstallment $installment, array $data): LoanInstallment;

    /** @return Collection<int, LoanInstallment> */
    public function findUnpaidByLoan(int $loanId): Collection;
}
