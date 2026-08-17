<?php

namespace App\Models;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $loan_id
 * @property int $installment_number
 * @property Carbon $due_date
 * @property float $amount
 * @property float $paid_amount
 * @property float $waived_amount
 * @property string $status
 * @property Carbon|null $paid_at
 */
class LoanInstallment extends Model
{
    protected $fillable = [
        'loan_id',
        'installment_number',
        'due_date',
        'amount',
        'paid_amount',
        'waived_amount',
        'status',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'waived_amount' => 'decimal:2',
            'due_date' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Loan, $this> */
    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    /** @return HasMany<LoanCharge, $this> */
    public function charges(): HasMany
    {
        return $this->hasMany(LoanCharge::class, 'loan_installment_id');
    }

    /** @return HasMany<PaymentAllocation, $this> */
    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class, 'installment_id');
    }

    public function isOverdue(?Carbon $asOf = null): bool
    {
        $asOf ??= now()->startOfDay();

        return in_array($this->status, ['pending', 'due', 'partially_paid', 'past_due'], true)
            && $asOf->gt($this->due_date);
    }

    public function remainingAmount(): float
    {
        return round((float) $this->amount - (float) $this->paid_amount - (float) $this->waived_amount, 2);
    }

    public function totalLateFees(): float
    {
        return (float) $this->charges()
            ->where('charge_type', ChargeType::LateFee->value)
            ->whereIn('status', ChargeStatus::unpaidStatuses())
            ->sum('balance');
    }
}
