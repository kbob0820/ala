<?php

namespace App\Repositories\Eloquent;

use App\Models\Refund;
use App\Repositories\Contracts\RefundRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class RefundRepository implements RefundRepositoryInterface
{
    public function create(array $data): Refund
    {
        return Refund::create($data);
    }

    public function find(int $id): ?Refund
    {
        return Refund::find($id);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Refund>
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = Refund::with(['loan', 'client']);

        if (! empty($filters['status'])) {
            $query->whereIn('status', (array) $filters['status']);
        }

        if (! empty($filters['loan_id'])) {
            $query->where('loan_id', $filters['loan_id']);
        }

        if (! empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }
}
