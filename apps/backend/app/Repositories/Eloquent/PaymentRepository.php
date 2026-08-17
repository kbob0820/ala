<?php

namespace App\Repositories\Eloquent;

use App\Models\Payment;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class PaymentRepository implements PaymentRepositoryInterface
{
    public function create(array $data): Payment
    {
        return Payment::create($data);
    }

    public function findByLoan(int $loanId): Collection
    {
        return Payment::where('loan_id', $loanId)
            ->orderBy('payment_date', 'desc')
            ->get();
    }
}
