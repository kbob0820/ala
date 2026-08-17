<?php

namespace App\Repositories\Contracts;

use App\Models\PaymentType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PaymentTypeRepositoryInterface
{
    /** @return LengthAwarePaginator<PaymentType> */
    public function paginate(int $perPage = 15): LengthAwarePaginator;

    public function find(int $id): ?PaymentType;

    /** @param array<string, mixed> $data */
    public function create(array $data): PaymentType;

    /** @param array<string, mixed> $data */
    public function update(PaymentType $paymentType, array $data): PaymentType;

    public function delete(PaymentType $paymentType): bool;
}
