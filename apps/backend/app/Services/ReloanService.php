<?php

namespace App\Services;

use App\Enums\ChargeStatus;
use App\Enums\LoanStatus;
use App\Enums\SettlementStatus;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanSettlement;
use Illuminate\Support\Facades\Log;

class ReloanService
{
    private const RELOAN_SETTLE_REASON = 'Settled by reloan';

    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    /**
     * Auto-close all active/past_due/delinquent loans for the borrower
     * when a reloan is released. Unpaid charges (late fees, etc.) are
     * settled as part of the old balance — never hidden.
     *
     * @return int[] IDs of loans that were closed
     */
    public function autoCloseOldLoans(Loan $newLoan, ?int $createdBy = null): array
    {
        $oldLoans = Loan::where('client_id', $newLoan->client_id)
            ->where('id', '!=', $newLoan->id)
            ->whereIn('loan_status', LoanStatus::activeStatuses())
            ->get();

        $closedIds = [];

        foreach ($oldLoans as $oldLoan) {
            $oldState = $oldLoan->only(['loan_status', 'closed_at']);

            $principalPortion = round((float) $oldLoan->remaining_balance, 2);
            $chargePortion = round($oldLoan->totalUnpaidCharges(), 2);
            $settlementAmount = round($principalPortion + $chargePortion, 2);

            $oldLoan->installments()
                ->whereIn('status', ['pending', 'due', 'partially_paid', 'past_due', 'overdue', 'missed'])
                ->update([
                    'status' => 'paid',
                    'paid_amount' => $oldLoan->installment_amount,
                    'paid_at' => now(),
                ]);

            $this->settleCharges($oldLoan);

            $oldLoan->update([
                'loan_status' => LoanStatus::SettledByReloan->value,
                'closed_at' => now(),
            ]);

            LoanSettlement::create([
                'reloan_loan_id' => $newLoan->id,
                'old_loan_id' => $oldLoan->id,
                'settlement_amount' => $settlementAmount,
                'principal_amount' => $principalPortion,
                'charge_amount' => $chargePortion,
                'settlement_date' => now()->toDateString(),
                'status' => SettlementStatus::Completed->value,
                'payment_id' => null,
                'created_by' => $createdBy ?? $newLoan->created_by,
                'approved_by' => null,
            ]);

            $this->auditService->log(
                'auto_closed',
                'App\\Models\\Loan',
                $oldLoan->id,
                $oldState,
                $oldLoan->only(['loan_status', 'closed_at']),
                'LN-'.$oldLoan->id
            );

            $closedIds[] = $oldLoan->id;
        }

        Log::info('Reloan auto-close completed', [
            'reloan_id' => $newLoan->id,
            'client_id' => $newLoan->client_id,
            'closed_loan_ids' => $closedIds,
        ]);

        return $closedIds;
    }

    /**
     * Restore loans that were auto-closed by a reloan.
     */
    public function restoreLoansFromReloan(Loan $reloan): void
    {
        $settlements = LoanSettlement::where('reloan_loan_id', $reloan->id)
            ->where('status', SettlementStatus::Completed->value)
            ->get();

        if ($settlements->isEmpty()) {
            return;
        }

        $restoredLoanIds = [];

        foreach ($settlements as $settlement) {
            $oldLoan = Loan::find($settlement->old_loan_id);

            if (! $oldLoan || $oldLoan->loan_status !== LoanStatus::SettledByReloan->value) {
                continue;
            }

            $oldState = $oldLoan->only(['loan_status', 'closed_at']);

            $oldLoan->installments()
                ->where('status', 'paid')
                ->update([
                    'status' => 'due',
                    'paid_amount' => 0,
                    'paid_at' => null,
                ]);

            $this->restoreCharges($oldLoan);

            $oldLoan->update([
                'loan_status' => LoanStatus::Active->value,
                'closed_at' => null,
            ]);

            $settlement->update(['status' => SettlementStatus::Voided->value]);

            $this->auditService->log(
                'restored',
                'App\\Models\\Loan',
                $oldLoan->id,
                $oldState,
                $oldLoan->only(['loan_status', 'closed_at']),
                'LN-'.$oldLoan->id
            );

            $restoredLoanIds[] = $oldLoan->id;
        }

        Log::info('Reloan auto-close restored', [
            'reloan_id' => $reloan->id,
            'restored_loan_ids' => $restoredLoanIds,
        ]);
    }

    private function settleCharges(Loan $loan): void
    {
        $loan->charges()
            ->whereIn('status', ChargeStatus::unpaidStatuses())
            ->get()
            ->each(function (LoanCharge $charge) {
                $charge->waived_amount = round((float) $charge->waived_amount + (float) $charge->balance, 2);
                $charge->recalculateBalance();
                $charge->reason = self::RELOAN_SETTLE_REASON;
                $charge->status = (float) $charge->paid_amount > 0
                    ? ChargeStatus::Paid->value
                    : ChargeStatus::Waived->value;
                $charge->save();
            });
    }

    private function restoreCharges(Loan $loan): void
    {
        $loan->charges()
            ->where('reason', self::RELOAN_SETTLE_REASON)
            ->get()
            ->each(function (LoanCharge $charge) {
                $charge->waived_amount = 0;
                $charge->recalculateBalance();
                $charge->reason = null;
                $charge->status = (float) $charge->paid_amount > 0
                    ? ChargeStatus::PartiallyPaid->value
                    : ChargeStatus::Assessed->value;
                $charge->save();
            });
    }
}
