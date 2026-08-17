<?php

namespace App\Services;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use App\Enums\PaymentAllocationType;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanInstallment;
use App\Models\Payment;
use App\Repositories\Contracts\PaymentAllocationRepositoryInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PaymentAllocationService extends BaseService
{
    public function __construct(
        AuditService $auditService,
        private readonly PaymentAllocationRepositoryInterface $allocationRepository,
        private readonly SettingsService $settingsService,
    ) {
        parent::__construct($auditService);
    }

    /**
     * Allocate a payment in priority order:
     * Late Fees -> Other Charges -> Past-Due -> Current.
     *
     * @return array{allocations: array<int, array<string, mixed>>, excess: float}
     */
    public function allocate(Payment $payment): array
    {
        return DB::transaction(function () use ($payment) {
            $loan = $payment->loan;
            $remaining = (float) $payment->amount;
            $allocations = [];

            [$lateFees, $otherCharges] = $this->outstandingCharges($loan);

            foreach ([...$lateFees, ...$otherCharges] as $charge) {
                if ($remaining <= 0) {
                    break;
                }

                $applied = min($remaining, (float) $charge->balance);
                if ($applied <= 0) {
                    continue;
                }

                $type = $charge->charge_type === ChargeType::LateFee->value
                    ? PaymentAllocationType::LateFee->value
                    : PaymentAllocationType::OtherCharge->value;

                $this->applyToCharge($charge, $applied, $payment->id, $type);
                $allocations[] = $this->describe($type, $applied, $charge->id, null);

                $remaining = round($remaining - $applied, 2);
            }

            [$pastDue, $current] = $this->unpaidInstallments($loan);

            foreach ([[$pastDue, PaymentAllocationType::PastDue->value], [$current, PaymentAllocationType::Current->value]] as [$installments, $type]) {
                foreach ($installments as $installment) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $due = $installment->remainingAmount();
                    if ($due <= 0) {
                        continue;
                    }

                    $applied = min($remaining, $due);

                    $this->applyToInstallment($installment, $applied, $payment->id, $type);
                    $allocations[] = $this->describe($type, $applied, null, $installment->id);

                    $remaining = round($remaining - $applied, 2);
                }
            }

            $this->auditService->log(
                'payment_allocated',
                Payment::class,
                $payment->id,
                null,
                ['amount' => (float) $payment->amount, 'allocations' => $allocations, 'excess' => $remaining],
                'PAY-'.$payment->id
            );

            return [
                'allocations' => $allocations,
                'excess' => $remaining,
            ];
        });
    }

    /**
     * Reverse a payment and its allocations without deleting financial records.
     *
     * @return array<int, array<string, mixed>>
     */
    public function reverse(Payment $payment): array
    {
        return DB::transaction(function () use ($payment) {
            $allocationRows = $this->allocationRepository->findByPayment($payment->id);
            $reversed = [];

            foreach ($allocationRows as $allocation) {
                if ($allocation->status !== 'applied') {
                    continue;
                }

                if ($allocation->charge_id !== null && $allocation->charge) {
                    $charge = $allocation->charge;
                    $charge->paid_amount = round((float) $charge->paid_amount - (float) $allocation->amount, 2);
                    $this->syncChargeStatus($charge);
                    $charge->save();
                }

                if ($allocation->installment_id !== null && $allocation->installment) {
                    $installment = $allocation->installment;
                    $installment->paid_amount = round((float) $installment->paid_amount - (float) $allocation->amount, 2);
                    $this->syncInstallmentStatus($installment);
                    $installment->save();
                }

                $allocation->update(['status' => 'reversed']);
                $reversed[] = [
                    'id' => $allocation->id,
                    'allocation_type' => $allocation->allocation_type,
                    'amount' => (float) $allocation->amount,
                ];
            }

            $this->auditService->log(
                'payment_reversed',
                Payment::class,
                $payment->id,
                ['amount' => (float) $payment->amount],
                ['reversed_allocations' => $reversed],
                'PAY-'.$payment->id
            );

            return $reversed;
        });
    }

    /**
     * Preview how an amount would be allocated without persisting anything.
     *
     * @return array{allocations: array<int, array<string, mixed>>, excess: float}
     */
    public function preview(Loan $loan, float $amount): array
    {
        $remaining = $amount;
        $allocations = [];

        [$lateFees, $otherCharges] = $this->outstandingCharges($loan);

        foreach ([...$lateFees, ...$otherCharges] as $charge) {
            if ($remaining <= 0) {
                break;
            }

            $applied = min($remaining, (float) $charge->balance);
            if ($applied <= 0) {
                continue;
            }

            $type = $charge->charge_type === ChargeType::LateFee->value
                ? PaymentAllocationType::LateFee->value
                : PaymentAllocationType::OtherCharge->value;

            $allocations[] = $this->describe($type, $applied, $charge->id, null);
            $remaining = round($remaining - $applied, 2);
        }

        [$pastDue, $current] = $this->unpaidInstallments($loan);

        foreach ([[$pastDue, PaymentAllocationType::PastDue->value], [$current, PaymentAllocationType::Current->value]] as [$installments, $type]) {
            foreach ($installments as $installment) {
                if ($remaining <= 0) {
                    break;
                }

                $due = $installment->remainingAmount();
                if ($due <= 0) {
                    continue;
                }

                $applied = min($remaining, $due);
                $allocations[] = $this->describe($type, $applied, null, $installment->id);
                $remaining = round($remaining - $applied, 2);
            }
        }

        return [
            'allocations' => $allocations,
            'excess' => $remaining,
        ];
    }

    private function applyToCharge(LoanCharge $charge, float $amount, int $paymentId, string $type): void
    {
        $this->allocationRepository->create([
            'payment_id' => $paymentId,
            'loan_id' => $charge->loan_id,
            'charge_id' => $charge->id,
            'installment_id' => null,
            'amount' => $amount,
            'allocation_type' => $type,
            'status' => 'applied',
        ]);

        $charge->paid_amount = round((float) $charge->paid_amount + $amount, 2);
        $this->syncChargeStatus($charge);
        $charge->save();
    }

    private function applyToInstallment(LoanInstallment $installment, float $amount, int $paymentId, string $type): void
    {
        $this->allocationRepository->create([
            'payment_id' => $paymentId,
            'loan_id' => $installment->loan_id,
            'charge_id' => null,
            'installment_id' => $installment->id,
            'amount' => $amount,
            'allocation_type' => $type,
            'status' => 'applied',
        ]);

        $installment->paid_amount = round((float) $installment->paid_amount + $amount, 2);
        $this->syncInstallmentStatus($installment);
        $installment->save();
    }

    private function syncChargeStatus(LoanCharge $charge): void
    {
        $charge->recalculateBalance();

        if ((float) $charge->balance <= 0) {
            $charge->status = ChargeStatus::Paid->value;
        } elseif ((float) $charge->paid_amount > 0) {
            $charge->status = ChargeStatus::PartiallyPaid->value;
        } else {
            $charge->status = ChargeStatus::Assessed->value;
        }
    }

    private function syncInstallmentStatus(LoanInstallment $installment): void
    {
        $remaining = $installment->remainingAmount();

        if ($remaining <= 0) {
            $installment->status = 'paid';
            $installment->paid_at ??= now();

            return;
        }

        $installment->paid_at = null;

        if ((float) $installment->paid_amount > 0) {
            $installment->status = 'partially_paid';

            return;
        }

        $threshold = now()->startOfDay()->subDays($this->settingsService->lateFeeGraceDays());

        if ($installment->due_date->lt($threshold)) {
            $installment->status = 'past_due';
        } elseif ($installment->due_date->lte(now()->startOfDay())) {
            $installment->status = 'due';
        } else {
            $installment->status = 'pending';
        }
    }

    /**
     * @return array{0: Collection<int, LoanCharge>, 1: Collection<int, LoanCharge>}
     */
    private function outstandingCharges(Loan $loan): array
    {
        $charges = $loan->charges()
            ->whereIn('status', ChargeStatus::unpaidStatuses())
            ->orderBy('assessment_date')
            ->orderBy('id')
            ->get();

        return [
            $charges->filter(fn (LoanCharge $c) => $c->charge_type === ChargeType::LateFee->value)->values(),
            $charges->filter(fn (LoanCharge $c) => $c->charge_type !== ChargeType::LateFee->value)->values(),
        ];
    }

    /**
     * @return array{0: Collection<int, LoanInstallment>, 1: Collection<int, LoanInstallment>}
     */
    private function unpaidInstallments(Loan $loan): array
    {
        $grace = $this->settingsService->lateFeeGraceDays();

        $overdueThreshold = Carbon::today()->subDays($grace)->toDateString();

        $installments = $loan->installments()
            ->whereIn('status', ['pending', 'due', 'partially_paid', 'past_due'])
            ->get();

        $pastDue = $installments
            ->filter(fn (LoanInstallment $i) => $i->remainingAmount() > 0 && $i->due_date->toDateString() < $overdueThreshold)
            ->sortBy(fn (LoanInstallment $i) => [$i->due_date->toDateString(), $i->installment_number])
            ->values();

        $current = $installments
            ->filter(fn (LoanInstallment $i) => $i->remainingAmount() > 0 && $i->due_date->toDateString() >= $overdueThreshold)
            ->sortBy(fn (LoanInstallment $i) => [$i->due_date->toDateString(), $i->installment_number])
            ->values();

        return [$pastDue, $current];
    }

    /** @return array<string, mixed> */
    private function describe(string $type, float $amount, ?int $chargeId, ?int $installmentId): array
    {
        return [
            'allocation_type' => $type,
            'amount' => round($amount, 2),
            'charge_id' => $chargeId,
            'installment_id' => $installmentId,
        ];
    }
}
