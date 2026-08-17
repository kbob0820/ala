<?php

namespace App\Services;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanInstallment;
use App\Repositories\Contracts\LoanChargeRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChargeService extends BaseService
{
    public function __construct(
        AuditService $auditService,
        private readonly LoanChargeRepositoryInterface $chargeRepository,
        private readonly SettingsService $settingsService,
    ) {
        parent::__construct($auditService);
    }

    /**
     * Assess a single late fee for an overdue payment schedule.
     * Returns null (no-op) when the schedule already has an active late fee.
     */
    public function assessLateFee(LoanInstallment $installment, ?int $userId = null, ?float $amount = null): ?LoanCharge
    {
        if ($this->chargeRepository->hasActiveLateFeeForInstallment($installment->id)) {
            return null;
        }

        $amount = $amount ?? $this->settingsService->lateFeeAmount();

        return DB::transaction(function () use ($installment, $amount, $userId) {
            $charge = $this->chargeRepository->create([
                'loan_id' => $installment->loan_id,
                'loan_installment_id' => $installment->id,
                'client_id' => $installment->loan->client_id,
                'charge_type' => ChargeType::LateFee->value,
                'description' => 'Late fee',
                'original_amount' => $amount,
                'paid_amount' => 0,
                'waived_amount' => 0,
                'balance' => $amount,
                'assessment_date' => now()->toDateString(),
                'due_date' => now()->toDateString(),
                'status' => ChargeStatus::Assessed->value,
                'reference' => $this->nextLateFeeReference($installment->id),
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $this->auditService->log(
                'late_fee_assessed',
                LoanCharge::class,
                $charge->id,
                null,
                $charge->only(['charge_type', 'original_amount', 'balance', 'status']),
                $charge->reference,
                'Automatic late fee assessment for overdue schedule'
            );

            return $charge;
        });
    }

    /** @param array<string, mixed> $data */
    public function assessManualCharge(Loan $loan, array $data, ?int $userId = null): LoanCharge
    {
        $type = ChargeType::from($data['charge_type']);
        $amount = (float) $data['amount'];

        return DB::transaction(function () use ($loan, $data, $type, $amount, $userId) {
            $charge = $this->chargeRepository->create([
                'loan_id' => $loan->id,
                'loan_installment_id' => $data['loan_installment_id'] ?? null,
                'client_id' => $loan->client_id,
                'charge_type' => $type->value,
                'description' => $data['description'] ?? $type->label(),
                'original_amount' => $amount,
                'paid_amount' => 0,
                'waived_amount' => 0,
                'balance' => $amount,
                'assessment_date' => $data['assessment_date'] ?? now()->toDateString(),
                'due_date' => $data['due_date'] ?? now()->toDateString(),
                'status' => ChargeStatus::Assessed->value,
                'reference' => $this->nextManualChargeReference($loan->id, $type),
                'reason' => $data['reason'] ?? null,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $this->auditService->log(
                'charge_assessed',
                LoanCharge::class,
                $charge->id,
                null,
                $charge->only(['charge_type', 'original_amount', 'balance', 'status']),
                $charge->reference,
                $data['reason'] ?? null
            );

            return $charge;
        });
    }

    public function requestWaiver(LoanCharge $charge, float $waiveAmount, string $reason, int $userId): LoanCharge
    {
        if (! in_array($charge->status, ChargeStatus::unpaidStatuses(), true)) {
            throw new \InvalidArgumentException('Only outstanding charges can be waived.');
        }

        if ($waiveAmount <= 0 || round($waiveAmount, 2) > round((float) $charge->balance, 2)) {
            throw new \InvalidArgumentException('Waiver amount must be greater than zero and not exceed the outstanding balance.');
        }

        return DB::transaction(function () use ($charge, $waiveAmount, $reason, $userId) {
            $oldState = $charge->only(['status', 'requested_waive_amount', 'requested_by', 'reason']);

            $charge->update([
                'requested_waive_amount' => round($waiveAmount, 2),
                'requested_by' => $userId,
                'reason' => $reason,
                'updated_by' => $userId,
            ]);

            $this->auditService->log(
                'waiver_requested',
                LoanCharge::class,
                $charge->id,
                $oldState,
                $charge->only(['status', 'requested_waive_amount', 'requested_by', 'reason']),
                $charge->reference,
                $reason
            );

            return $charge;
        });
    }

    public function approveWaiver(LoanCharge $charge, float $waiveAmount, int $userId): LoanCharge
    {
        if (! in_array($charge->status, ChargeStatus::unpaidStatuses(), true)) {
            throw new \InvalidArgumentException('Only outstanding charges can be waived.');
        }

        if ($waiveAmount <= 0 || round($waiveAmount, 2) > round((float) $charge->balance, 2)) {
            throw new \InvalidArgumentException('Waiver amount must be greater than zero and not exceed the outstanding balance.');
        }

        return DB::transaction(function () use ($charge, $waiveAmount, $userId) {
            $oldState = $charge->only(['waived_amount', 'balance', 'status', 'approved_by', 'approved_at', 'reason']);

            $charge->waived_amount = round((float) $charge->waived_amount + $waiveAmount, 2);
            $charge->recalculateBalance();
            $charge->approved_by = $userId;
            $charge->approved_at = now();
            $charge->updated_by = $userId;
            $this->syncStatus($charge);
            $charge->save();

            $this->auditService->log(
                'waiver_approved',
                LoanCharge::class,
                $charge->id,
                $oldState,
                $charge->only(['waived_amount', 'balance', 'status', 'approved_by', 'approved_at']),
                $charge->reference,
                $charge->reason
            );

            return $charge;
        });
    }

    public function rejectWaiver(LoanCharge $charge, int $userId): LoanCharge
    {
        return DB::transaction(function () use ($charge, $userId) {
            $oldState = $charge->only(['requested_waive_amount', 'requested_by', 'reason']);

            $charge->update([
                'requested_waive_amount' => null,
                'requested_by' => null,
                'updated_by' => $userId,
            ]);

            $this->auditService->log(
                'waiver_rejected',
                LoanCharge::class,
                $charge->id,
                $oldState,
                $charge->only(['requested_waive_amount', 'requested_by']),
                $charge->reference,
                $charge->reason
            );

            return $charge;
        });
    }

    public function reverse(LoanCharge $charge, string $reason, int $userId): LoanCharge
    {
        if ($charge->status === ChargeStatus::Reversed->value) {
            throw new \InvalidArgumentException('Charge is already reversed.');
        }

        if ((float) $charge->paid_amount > 0) {
            throw new \InvalidArgumentException('A charge with recorded payments cannot be reversed directly; reverse the payment first.');
        }

        return DB::transaction(function () use ($charge, $reason, $userId) {
            $oldState = $charge->only(['status', 'balance', 'reversed_by', 'reversed_at', 'reason']);

            $charge->update([
                'status' => ChargeStatus::Reversed->value,
                'reversed_by' => $userId,
                'reversed_at' => now(),
                'reason' => $reason,
                'updated_by' => $userId,
            ]);

            $this->auditService->log(
                'charge_reversed',
                LoanCharge::class,
                $charge->id,
                $oldState,
                $charge->only(['status', 'reversed_by', 'reversed_at', 'reason']),
                $charge->reference,
                $reason
            );

            return $charge;
        });
    }

    public function updateAmount(LoanCharge $charge, float $amount, int $userId): LoanCharge
    {
        if (! in_array($charge->status, ChargeStatus::unpaidStatuses(), true)) {
            throw new \InvalidArgumentException('Only outstanding charges can be edited.');
        }

        if ((float) $charge->paid_amount > 0) {
            throw new \InvalidArgumentException('A charge with recorded payments cannot be edited; reverse the payment first.');
        }

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Amount must be greater than zero.');
        }

        return DB::transaction(function () use ($charge, $amount, $userId) {
            $oldState = $charge->only(['original_amount', 'balance', 'status']);

            $charge->original_amount = round($amount, 2);
            $charge->recalculateBalance();
            $this->syncStatus($charge);
            $charge->updated_by = $userId;
            $charge->save();

            $this->auditService->log(
                'charge_updated',
                LoanCharge::class,
                $charge->id,
                $oldState,
                $charge->only(['original_amount', 'balance', 'status']),
                $charge->reference,
                'Charge amount edited'
            );

            return $charge;
        });
    }

    private function syncStatus(LoanCharge $charge): void
    {
        $charge->recalculateBalance();

        if ((float) $charge->balance <= 0) {
            $charge->status = (float) $charge->paid_amount > 0
                ? ChargeStatus::Paid->value
                : ChargeStatus::Waived->value;
        } elseif ((float) $charge->paid_amount > 0) {
            $charge->status = ChargeStatus::PartiallyPaid->value;
        } else {
            $charge->status = ChargeStatus::Assessed->value;
        }
    }

    private function nextLateFeeReference(int $installmentId): string
    {
        $count = LoanCharge::where('loan_installment_id', $installmentId)
            ->where('charge_type', ChargeType::LateFee->value)
            ->withTrashed()
            ->count();

        return $count === 0
            ? "LF-{$installmentId}"
            : "LF-{$installmentId}-".($count + 1);
    }

    private function nextManualChargeReference(int $loanId, ChargeType $type): string
    {
        $prefix = match ($type) {
            ChargeType::TransferFee => 'TRF',
            default => 'OCH',
        };

        $count = LoanCharge::where('loan_id', $loanId)
            ->where('charge_type', $type->value)
            ->withTrashed()
            ->count();

        return sprintf('%s-%d-%d-%s', $prefix, $loanId, $count + 1, Str::upper(Str::random(4)));
    }
}
