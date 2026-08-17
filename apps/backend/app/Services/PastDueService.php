<?php

namespace App\Services;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanInstallment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PastDueService extends BaseService
{
    public function __construct(
        AuditService $auditService,
        private readonly ChargeService $chargeService,
        private readonly SettingsService $settingsService,
    ) {
        parent::__construct($auditService);
    }

    /**
     * Detect past-due schedules, assess late fees (once each), and update
     * loan status. Safe to run repeatedly — never duplicates a late fee.
     *
     * @return array{past_due_marked: int, late_fees_assessed: int, overdue_schedules: int, loans_updated: int}
     */
    public function process(): array
    {
        return DB::transaction(function () {
            $grace = $this->settingsService->lateFeeGraceDays();
            $threshold = Carbon::today()->subDays($grace)->toDateString();

            $overdueInstallments = LoanInstallment::whereIn('status', ['pending', 'due', 'partially_paid', 'past_due'])
                ->where('due_date', '<', $threshold)
                ->whereRaw('paid_amount < amount')
                ->get();

            $pastDueMarked = 0;
            $lateFeesAssessed = 0;
            $maxDaysOverdueByLoan = [];

            foreach ($overdueInstallments as $installment) {
                if ($installment->status !== 'past_due') {
                    $installment->update(['status' => 'past_due']);
                    $pastDueMarked++;
                }

                $charge = $this->chargeService->assessLateFee($installment);
                if ($charge !== null) {
                    $lateFeesAssessed++;
                }

                $daysOverdue = (int) $installment->due_date->diffInDays(Carbon::today());
                $maxDaysOverdueByLoan[$installment->loan_id] = max(
                    $maxDaysOverdueByLoan[$installment->loan_id] ?? 0,
                    $daysOverdue,
                );
            }

            $loansUpdated = 0;

            foreach ($maxDaysOverdueByLoan as $loanId => $daysOverdue) {
                $loan = Loan::find($loanId);

                if (! $loan) {
                    continue;
                }

                $newStatus = $daysOverdue >= 90 ? 'defaulted' : 'past_due';

                if ($loan->loan_status !== $newStatus) {
                    $loan->update(['loan_status' => $newStatus]);
                    $loansUpdated++;
                }
            }

            return [
                'past_due_marked' => $pastDueMarked,
                'late_fees_assessed' => $lateFeesAssessed,
                'overdue_schedules' => $overdueInstallments->count(),
                'loans_updated' => $loansUpdated,
            ];
        });
    }

    /**
     * Undo past-due processing for a single loan: reverse unpaid late fees,
     * revert installment statuses, and restore the loan to active.
     *
     * @return array{late_fees_reversed: int, installments_reverted: int, loans_reverted: int}
     */
    public function undo(Loan $loan, ?int $userId = null): array
    {
        return DB::transaction(function () use ($loan, $userId) {
            $loan->refresh();

            $installments = $loan->installments()
                ->where('status', 'past_due')
                ->get();

            $lateFeesReversed = 0;
            $installmentsReverted = 0;

            foreach ($installments as $installment) {
                $lateFees = $installment->charges()
                    ->where('charge_type', 'LATE_FEE')
                    ->where('status', 'ASSESSED')
                    ->get();

                foreach ($lateFees as $charge) {
                    $this->chargeService->reverse($charge, 'Past-due processing undone', (int) $userId);
                    $lateFeesReversed++;
                }

                $naturalStatus = $this->naturalStatus($installment);

                if ($installment->status !== $naturalStatus) {
                    $installment->update(['status' => $naturalStatus]);
                    $installmentsReverted++;
                }
            }

            $loansReverted = 0;

            if (in_array($loan->loan_status, ['past_due', 'defaulted'], true)) {
                $loan->update(['loan_status' => 'active']);
                $loansReverted = 1;
            }

            return [
                'late_fees_reversed' => $lateFeesReversed,
                'installments_reverted' => $installmentsReverted,
                'loans_reverted' => $loansReverted,
            ];
        });
    }

    private function naturalStatus(LoanInstallment $installment): string
    {
        if ((float) $installment->paid_amount > 0) {
            return 'partially_paid';
        }

        if ($installment->due_date->isPast()) {
            return 'due';
        }

        return 'pending';
    }

    /**
     * Process past-due for a single loan, applying caller-specified late fee
     * amounts per installment (0 skips the fee but still marks past-due).
     *
     * @param  array<int, array{id: int, late_fee: float}>  $installments
     * @return array{overdue_schedules: int, past_due_marked: int, late_fees_assessed: int, loans_updated: int}
     */
    public function processLoan(Loan $loan, array $installments, ?int $userId = null): array
    {
        return DB::transaction(function () use ($loan, $installments, $userId) {
            $today = Carbon::today()->toDateString();

            $pastDueMarked = 0;
            $lateFeesAssessed = 0;
            $maxDaysOverdue = 0;

            foreach ($installments as $entry) {
                $installment = $loan->installments()
                    ->where('id', $entry['id'])
                    ->first();

                if (! $installment
                    || ! in_array($installment->status, ['pending', 'due', 'partially_paid', 'past_due'], true)
                    || ! $installment->due_date->isBefore($today)) {
                    continue;
                }

                if ($installment->status !== 'past_due') {
                    $installment->update(['status' => 'past_due']);
                    $pastDueMarked++;
                }

                $feeAmount = (float) ($entry['late_fee'] ?? 0);

                if ($feeAmount > 0) {
                    $charge = $this->chargeService->assessLateFee($installment, $userId, $feeAmount);
                    if ($charge !== null) {
                        $lateFeesAssessed++;
                    }
                }

                $maxDaysOverdue = max($maxDaysOverdue, (int) $installment->due_date->diffInDays(Carbon::today()));
            }

            $loansUpdated = 0;

            if ($maxDaysOverdue > 0) {
                $newStatus = $maxDaysOverdue >= 90 ? 'defaulted' : 'past_due';

                if ($loan->loan_status !== $newStatus) {
                    $loan->update(['loan_status' => $newStatus]);
                    $loansUpdated = 1;
                }
            }

            return [
                'overdue_schedules' => count($installments),
                'past_due_marked' => $pastDueMarked,
                'late_fees_assessed' => $lateFeesAssessed,
                'loans_updated' => $loansUpdated,
            ];
        });
    }

    /**
     * Edit the amount of an installment's outstanding late fee.
     */
    public function updateLateFee(LoanInstallment $installment, float $amount, ?int $userId = null): LoanCharge
    {
        $charge = $installment->charges()
            ->where('charge_type', ChargeType::LateFee->value)
            ->whereIn('status', ChargeStatus::unpaidStatuses())
            ->first();

        if (! $charge) {
            throw new \InvalidArgumentException('No outstanding late fee to edit for this schedule.');
        }

        return $this->chargeService->updateAmount($charge, $amount, (int) $userId);
    }
}
