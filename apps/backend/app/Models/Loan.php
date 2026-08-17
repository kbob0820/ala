<?php

namespace App\Models;

use App\Enums\ChargeStatus;
use App\Enums\InstallmentStatus;
use App\Enums\SettlementStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $client_id
 * @property int|null $parent_loan_id
 * @property string $loan_type
 * @property string|null $loan_number
 * @property float|null $term_months
 * @property float $interest_rate_per_month
 * @property float $charges
 * @property string|null $charges_description
 * @property float $old_balance_settlement
 * @property float $total_deductions
 * @property Carbon|null $first_payment_due_date
 * @property string $application_status
 * @property string|null $loan_status
 * @property string|null $collection_status
 * @property int $total_installments
 * @property float $amount
 * @property float $total_interest
 * @property float $net_proceeds
 * @property float $installment_amount
 * @property float $remaining_balance
 * @property float $total_outstanding
 * @property Carbon|null $approved_at
 * @property Carbon|null $released_at
 * @property Carbon|null $closed_at
 */
class Loan extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'client_id',
        'parent_loan_id',
        'loan_type',
        'loan_number',
        'created_by',
        'approved_by',
        'term_months',
        'interest_rate_per_month',
        'charges',
        'charges_description',
        'old_balance_settlement',
        'total_deductions',
        'guarantor',
        'first_payment_due_date',
        'application_status',
        'loan_status',
        'collection_status',
        'total_installments',
        'amount',
        'total_interest',
        'net_proceeds',
        'installment_amount',
        'approved_at',
        'released_at',
        'closed_at',
    ];

    protected $appends = ['remaining_balance', 'total_outstanding'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'total_interest' => 'decimal:2',
            'interest_rate_per_month' => 'decimal:2',
            'term_months' => 'float',
            'charges' => 'decimal:2',
            'old_balance_settlement' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'net_proceeds' => 'decimal:2',
            'first_payment_due_date' => 'datetime',
            'installment_amount' => 'decimal:2',
            'approved_at' => 'datetime',
            'released_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<Loan, $this> */
    public function parentLoan(): BelongsTo
    {
        return $this->belongsTo(Loan::class, 'parent_loan_id');
    }

    /** @return HasMany<Loan, $this> */
    public function childLoans(): HasMany
    {
        return $this->hasMany(Loan::class, 'parent_loan_id');
    }

    /** @return HasMany<LoanSettlement, $this> */
    public function settlementsAsReloan(): HasMany
    {
        return $this->hasMany(LoanSettlement::class, 'reloan_loan_id');
    }

    /** @return HasMany<LoanSettlement, $this> */
    public function settlementsAsOldLoan(): HasMany
    {
        return $this->hasMany(LoanSettlement::class, 'old_loan_id');
    }

    /** @return HasMany<LoanInstallment, $this> */
    public function installments(): HasMany
    {
        return $this->hasMany(LoanInstallment::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** @return HasMany<LoanCharge, $this> */
    public function charges(): HasMany
    {
        return $this->hasMany(LoanCharge::class);
    }

    /** @return HasMany<Refund, $this> */
    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function totalUnpaidCharges(?string $chargeType = null): float
    {
        $query = $this->charges()->whereIn('status', ChargeStatus::unpaidStatuses());

        if ($chargeType !== null) {
            $query->where('charge_type', $chargeType);
        }

        return round((float) $query->sum('balance'), 2);
    }

    public function pastDueAmount(): float
    {
        $today = now()->toDateString();

        return round((float) $this->installments()
            ->where('due_date', '<', $today)
            ->whereIn('status', InstallmentStatus::unpaidStatuses())
            ->get()
            ->sum(fn (LoanInstallment $installment) => $installment->remainingAmount()), 2);
    }

    public function totalOutstandingBalance(): float
    {
        return round(
            (float) $this->remaining_balance
            + $this->totalUnpaidCharges(), 2);
    }

    public function hasOverdueInstallments(): bool
    {
        return $this->installments()
            ->whereIn('status', InstallmentStatus::overdueStatuses())
            ->where('due_date', '<', now()->toDateString())
            ->exists();
    }

    /** @return HasMany<LoanReleaseSource, $this> */
    public function releaseSources(): HasMany
    {
        return $this->hasMany(LoanReleaseSource::class);
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function totalPaid(): float
    {
        return (float) $this->payments()
            ->where('status', '!=', 'reversed')
            ->sum('amount');
    }

    public function getRemainingBalanceAttribute(): float
    {
        $settledPrincipal = (float) $this->settlementsAsOldLoan()
            ->where('status', SettlementStatus::Completed->value)
            ->sum('principal_amount');

        return max(0.0, (float) $this->amount - $this->totalPaid() - $settledPrincipal);
    }

    public function getTotalOutstandingAttribute(): float
    {
        return $this->totalOutstandingBalance();
    }
}
