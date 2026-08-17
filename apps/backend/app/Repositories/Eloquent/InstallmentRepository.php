<?php

namespace App\Repositories\Eloquent;

use App\Models\LoanInstallment;
use App\Repositories\Contracts\InstallmentRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class InstallmentRepository implements InstallmentRepositoryInterface
{
    public function create(array $data): LoanInstallment
    {
        return LoanInstallment::create($data);
    }

    public function update(LoanInstallment $installment, array $data): LoanInstallment
    {
        $installment->update($data);

        return $installment->fresh();
    }

    public function findUnpaidByLoan(int $loanId): Collection
    {
        return LoanInstallment::where('loan_id', $loanId)
            ->whereNotIn('status', ['paid'])
            ->orderBy('installment_number')
            ->get();
    }
}
