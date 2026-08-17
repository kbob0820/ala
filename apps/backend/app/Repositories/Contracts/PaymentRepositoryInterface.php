<?php

namespace App\Repositories\Contracts;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Collection;

interface PaymentRepositoryInterface
{
    /** @param array<string, mixed> $data */
    public function create(array $data): Payment;

    /** @return Collection<int, Payment> */
    public function findByLoan(int $loanId): Collection;
}
