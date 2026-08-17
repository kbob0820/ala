<?php

namespace App\Repositories\Eloquent;

use App\Models\PaymentAllocation;
use App\Repositories\Contracts\PaymentAllocationRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class PaymentAllocationRepository implements PaymentAllocationRepositoryInterface
{
    public function create(array $data): PaymentAllocation
    {
        return PaymentAllocation::create($data);
    }

    public function findByPayment(int $paymentId): Collection
    {
        return PaymentAllocation::where('payment_id', $paymentId)
            ->orderBy('id')
            ->get();
    }
}
