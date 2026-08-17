<?php

namespace App\Repositories\Eloquent;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use App\Models\LoanCharge;
use App\Repositories\Contracts\LoanChargeRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class LoanChargeRepository implements LoanChargeRepositoryInterface
{
    public function create(array $data): LoanCharge
    {
        return LoanCharge::create($data);
    }

    public function find(int $id): ?LoanCharge
    {
        return LoanCharge::find($id);
    }

    public function findByLoan(int $loanId): Collection
    {
        return LoanCharge::where('loan_id', $loanId)
            ->orderBy('assessment_date')
            ->orderBy('id')
            ->get();
    }

    public function unpaidForLoan(int $loanId): Collection
    {
        return LoanCharge::where('loan_id', $loanId)
            ->whereIn('status', ChargeStatus::unpaidStatuses())
            ->orderBy('assessment_date')
            ->orderBy('id')
            ->get();
    }

    public function hasActiveLateFeeForInstallment(int $installmentId): bool
    {
        return LoanCharge::where('loan_installment_id', $installmentId)
            ->where('charge_type', ChargeType::LateFee->value)
            ->whereIn('status', ChargeStatus::unpaidStatuses())
            ->exists();
    }
}
