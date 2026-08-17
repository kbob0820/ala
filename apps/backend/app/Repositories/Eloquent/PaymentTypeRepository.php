<?php

namespace App\Repositories\Eloquent;

use App\Models\PaymentType;
use App\Repositories\Contracts\PaymentTypeRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PaymentTypeRepository implements PaymentTypeRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return PaymentType::orderBy('category')->orderBy('name')->paginate($perPage);
    }

    public function find(int $id): ?PaymentType
    {
        return PaymentType::find($id);
    }

    public function create(array $data): PaymentType
    {
        return PaymentType::create($data);
    }

    public function update(PaymentType $paymentType, array $data): PaymentType
    {
        $paymentType->update($data);

        return $paymentType->fresh();
    }

    public function delete(PaymentType $paymentType): bool
    {
        return (bool) $paymentType->delete();
    }
}
