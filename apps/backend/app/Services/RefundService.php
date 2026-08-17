<?php

namespace App\Services;

use App\Enums\RefundStatus;
use App\Models\Loan;
use App\Models\Refund;
use App\Repositories\Contracts\RefundRepositoryInterface;
use Illuminate\Support\Facades\DB;

class RefundService extends BaseService
{
    public function __construct(
        AuditService $auditService,
        private readonly RefundRepositoryInterface $refundRepository,
    ) {
        parent::__construct($auditService);
    }

    /**
     * Excess collections = total paid - (loan amount + unpaid charges).
     * Unpaid late fees are never treated as refundable.
     */
    public function detectOverpayment(Loan $loan): float
    {
        $obligation = (float) $loan->amount + $loan->totalUnpaidCharges();

        return round(max(0, $loan->totalPaid() - $obligation), 2);
    }

    /** @param array<string, mixed> $data */
    public function request(Loan $loan, array $data, int $userId): Refund
    {
        $amount = (float) $data['amount'];
        $overpayment = $this->detectOverpayment($loan);

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Refund amount must be greater than zero.');
        }

        if (round($amount, 2) > round($overpayment, 2)) {
            throw new \InvalidArgumentException('Refund amount cannot exceed the refundable overpayment.');
        }

        return DB::transaction(function () use ($loan, $data, $amount) {
            $refund = $this->refundRepository->create([
                'loan_id' => $loan->id,
                'client_id' => $loan->client_id,
                'amount' => $amount,
                'reason' => $data['reason'],
                'status' => RefundStatus::Requested->value,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->auditService->log(
                'refund_requested',
                Refund::class,
                $refund->id,
                null,
                $refund->only(['amount', 'status', 'reason']),
                'RFD-'.$refund->id,
                $data['reason'] ?? null
            );

            return $refund;
        });
    }

    public function verify(Refund $refund, int $userId): Refund
    {
        return $this->transition($refund, RefundStatus::Verified->value, [
            'verified_by' => $userId,
            'verified_at' => now(),
        ], 'refund_verified');
    }

    public function approve(Refund $refund, int $userId): Refund
    {
        return $this->transition($refund, RefundStatus::Approved->value, [
            'approved_by' => $userId,
            'approved_at' => now(),
        ], 'refund_approved');
    }

    /** @param array<string, mixed> $data */
    public function release(Refund $refund, array $data, int $userId): Refund
    {
        if ($refund->status !== RefundStatus::Approved->value) {
            throw new \InvalidArgumentException('Only approved refunds can be released.');
        }

        return $this->transition($refund, RefundStatus::Released->value, [
            'released_by' => $userId,
            'released_at' => now(),
            'release_method' => $data['release_method'] ?? null,
            'notes' => $data['notes'] ?? $refund->notes,
        ], 'refund_released');
    }

    public function complete(Refund $refund, int $userId): Refund
    {
        return $this->transition($refund, RefundStatus::Completed->value, [
            'completed_at' => now(),
        ], 'refund_completed');
    }

    /** @param array<string, mixed> $data */
    public function reject(Refund $refund, array $data, int $userId): Refund
    {
        if (in_array($refund->status, [RefundStatus::Completed->value, RefundStatus::Released->value], true)) {
            throw new \InvalidArgumentException('A released or completed refund cannot be rejected.');
        }

        return $this->transition($refund, RefundStatus::Rejected->value, [
            'rejected_at' => now(),
            'notes' => $data['notes'] ?? $refund->notes,
        ], 'refund_rejected');
    }

    /** @param array<string, mixed> $data */
    private function transition(Refund $refund, string $status, array $data, string $action): Refund
    {
        return DB::transaction(function () use ($refund, $status, $data, $action) {
            $oldState = $refund->only(['status']);

            $refund->update(array_merge($data, ['status' => $status]));

            $this->auditService->log(
                $action,
                Refund::class,
                $refund->id,
                $oldState,
                $refund->only(['status']),
                'RFD-'.$refund->id
            );

            return $refund;
        });
    }
}
