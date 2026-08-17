<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $payment_id
 * @property int $loan_id
 * @property int|null $charge_id
 * @property int|null $installment_id
 * @property float $amount
 * @property string $allocation_type
 * @property string $status
 */
class PaymentAllocation extends Model
{
    protected $table = 'payment_allocations';

    protected $fillable = [
        'payment_id',
        'loan_id',
        'charge_id',
        'installment_id',
        'amount',
        'allocation_type',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Payment, $this> */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** @return BelongsTo<Loan, $this> */
    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    /** @return BelongsTo<LoanCharge, $this> */
    public function charge(): BelongsTo
    {
        return $this->belongsTo(LoanCharge::class, 'charge_id');
    }

    /** @return BelongsTo<LoanInstallment, $this> */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(LoanInstallment::class, 'installment_id');
    }
}
