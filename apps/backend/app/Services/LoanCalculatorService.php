<?php

namespace App\Services;

use App\Enums\ChargeType;
use App\Models\Loan;
use Illuminate\Support\Carbon;

class LoanCalculatorService
{
    /**
     * @param  float  $amount  Gross loan amount (or monthly installment amount when $calculationType is 'monthly_installment')
     * @param  float  $termMonths  Number of months (half-month precision, e.g. 2.5 = 5 installments)
     * @param  float|null  $interestRate  Interest rate per month (percentage); defaults to the configured value
     * @param  int  $cutoffsPerMonth  Installments per month (default 2)
     * @param  int|null  $clientId  Optional client ID to fetch existing loan balances
     * @param  int|null  $parentLoanId  Optional parent loan ID for reloan — used to exclude from existing balance sum
     * @param  string|null  $firstPaymentDueDate  Optional first payment due date for schedule generation
     * @param  string  $calculationType  'gross_amount' (default) or 'monthly_installment'
     * @return array{amount: float, total_interest: float, net_proceeds: float, total_installments: int, installment_amount: float, term_months: float, interest_rate_per_month: float, existing_loans?: array<int, array{id: int, amount: float, remaining_balance: float, loan_status: string|null, term_months: float|null}>, total_existing_balance?: float, net_proceeds_after_deduction?: float, total_exposure?: float, schedule: array<int, array{installment_number: int, due_date: string, amount: float}>}
     */
    public function calculate(float $amount, float $termMonths, ?float $interestRate = null, int $cutoffsPerMonth = 2, ?int $clientId = null, ?int $parentLoanId = null, ?string $firstPaymentDueDate = null, string $calculationType = 'gross_amount'): array
    {
        $interestRate ??= (float) config('loans.interest_rate_per_month');

        $totalInstallments = (int) round($termMonths * $cutoffsPerMonth);

        if ($calculationType === 'monthly_installment') {
            $monthlyInstallment = $amount;
            $amount = round($monthlyInstallment * $totalInstallments, 2);
        } elseif ($calculationType === 'net_proceeds') {
            $factor = 1 - ($interestRate / 100) * $termMonths;
            $amount = $factor > 0 ? round($amount / $factor, 2) : $amount;
        }

        $totalInterest = round($amount * ($interestRate / 100) * $termMonths, 2);
        $netProceeds = round($amount - $totalInterest, 2);
        $installmentAmount = round($amount / $totalInstallments, 2);

        $schedule = $this->generateSchedule($amount, $totalInstallments, $installmentAmount, $cutoffsPerMonth, $firstPaymentDueDate);

        $result = [
            'amount' => $amount,
            'term_months' => $termMonths,
            'interest_rate_per_month' => $interestRate,
            'total_interest' => $totalInterest,
            'net_proceeds' => $netProceeds,
            'total_installments' => $totalInstallments,
            'installment_amount' => $installmentAmount,
            'schedule' => $schedule,
        ];

        if ($clientId !== null) {
            $result = array_merge($result, $this->getExistingLoanBalances($clientId, $amount, $netProceeds, $parentLoanId));
        }

        return $result;
    }

    /**
     * @return array{existing_loans: array<int, array{id: int, amount: float, remaining_balance: float, late_fees: float, other_charges: float, total_outstanding: float, loan_status: string|null, term_months: float|null}>, total_existing_balance: float, net_proceeds_after_deduction: float, total_exposure: float}
     */
    private function getExistingLoanBalances(int $clientId, float $newAmount, float $netProceeds, ?int $parentLoanId = null): array
    {
        $query = Loan::with('payments')
            ->where('client_id', $clientId)
            ->whereIn('loan_status', ['active', 'past_due', 'delinquent']);

        if ($parentLoanId !== null) {
            $query->where('id', '!=', $parentLoanId);
        }

        $existingLoans = $query->get();

        $existingLoansData = [];
        $totalExistingBalance = 0.0;

        foreach ($existingLoans as $loan) {
            $lateFees = $loan->totalUnpaidCharges(ChargeType::LateFee->value);
            $otherCharges = $loan->totalUnpaidCharges() - $lateFees;
            $remaining = (float) $loan->remaining_balance;
            $totalOutstanding = round($remaining + $lateFees + $otherCharges, 2);

            $existingLoansData[] = [
                'id' => $loan->id,
                'amount' => (float) $loan->amount,
                'remaining_balance' => $remaining,
                'late_fees' => round($lateFees, 2),
                'other_charges' => round($otherCharges, 2),
                'total_outstanding' => $totalOutstanding,
                'loan_status' => $loan->loan_status,
                'term_months' => $loan->term_months,
            ];
            $totalExistingBalance += $totalOutstanding;
        }

        $totalExistingBalance = round($totalExistingBalance, 2);
        $netProceedsAfterDeduction = round(max(0, $netProceeds - $totalExistingBalance), 2);
        $totalExposure = round($newAmount + $totalExistingBalance, 2);

        return [
            'existing_loans' => $existingLoansData,
            'total_existing_balance' => $totalExistingBalance,
            'net_proceeds_after_deduction' => $netProceedsAfterDeduction,
            'total_exposure' => $totalExposure,
        ];
    }

    /**
     * @return array<int, array{installment_number: int, due_date: string, amount: float}>
     */
    private function generateSchedule(float $principal, int $totalInstallments, float $installmentAmount, int $perMonth, ?string $firstPaymentDueDate = null): array
    {
        $schedule = [];
        $useCustomStart = $firstPaymentDueDate !== null;

        for ($i = 1; $i <= $totalInstallments; $i++) {
            if ($useCustomStart) {
                $startDate = Carbon::parse($firstPaymentDueDate);

                if ($perMonth === 1) {
                    $dueDate = $startDate->copy()->addMonthsNoOverflow($i - 1);
                } else {
                    $intervalDays = $perMonth === 2 ? 15 : (int) floor(30 / $perMonth);
                    $dueDate = $startDate->copy()->addDays(($i - 1) * $intervalDays);
                }
            } else {
                $cycleMonth = intdiv($i - 1, $perMonth);
                $positionInMonth = ($i - 1) % $perMonth;

                $baseDate = now()->addMonthsNoOverflow($cycleMonth)->startOfMonth();

                if ($perMonth === 2) {
                    $dueDate = $positionInMonth === 0
                        ? $baseDate->copy()->day(15)
                        : $baseDate->copy()->endOfMonth();
                } else {
                    $step = (int) floor(30 / $perMonth);
                    $dueDate = $baseDate->copy()->addDays($positionInMonth * $step);
                }
            }

            $schedule[] = [
                'installment_number' => $i,
                'due_date' => $dueDate->toDateString(),
                'amount' => $installmentAmount,
            ];
        }

        $totalScheduled = array_sum(array_column($schedule, 'amount'));
        $adjustment = round($principal - $totalScheduled, 2);

        if ($adjustment !== 0.0) {
            $schedule[$totalInstallments - 1]['amount'] = round($schedule[$totalInstallments - 1]['amount'] + $adjustment, 2);
        }

        return $schedule;
    }
}
