<?php

namespace App\Repositories\Eloquent;

use App\Models\Loan;
use App\Repositories\Contracts\LoanRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class LoanRepository implements LoanRepositoryInterface
{
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = Loan::with(['client', 'createdBy', 'approvedBy']);

        if (! empty($filters['application_status'])) {
            $query->whereIn('application_status', (array) $filters['application_status']);
        }

        if (! empty($filters['loan_status'])) {
            $query->whereIn('loan_status', (array) $filters['loan_status']);
        }

        if (! empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('client', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function find(int $id): ?Loan
    {
        return Loan::with(['client', 'createdBy', 'approvedBy'])->find($id);
    }

    public function create(array $data): Loan
    {
        return Loan::create($data);
    }

    public function update(Loan $loan, array $data): Loan
    {
        $loan->update($data);

        return $loan->fresh(['client', 'createdBy', 'approvedBy']);
    }

    public function delete(Loan $loan): bool
    {
        return (bool) $loan->delete();
    }

    public function findActiveForClient(int $clientId): Collection
    {
        return Loan::where('client_id', $clientId)
            ->whereIn('loan_status', ['active', 'past_due', 'delinquent'])
            ->get();
    }
}
