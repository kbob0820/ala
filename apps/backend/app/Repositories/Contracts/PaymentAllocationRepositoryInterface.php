<?php

namespace App\Repositories\Contracts;

use App\Models\PaymentAllocation;
use Illuminate\Database\Eloquent\Collection;

interface PaymentAllocationRepositoryInterface
{
    /** @param array<string, mixed> $data */
    public function create(array $data): PaymentAllocation;

    /** @return Collection<int, PaymentAllocation> */
    public function findByPayment(int $paymentId): Collection;
}
