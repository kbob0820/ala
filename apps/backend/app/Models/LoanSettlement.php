<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $reloan_loan_id
 * @property int $old_loan_id
 * @property float $settlement_amount
 * @property float $principal_amount
 * @property float $charge_amount
 * @property string $settlement_date
 * @property string $status
 * @property int|null $payment_id
 * @property int $created_by
 * @property int|null $approved_by
 * @property Carbon|null $deleted_at
 */
class LoanSettlement extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reloan_loan_id',
        'old_loan_id',
        'settlement_amount',
        'principal_amount',
        'charge_amount',
        'settlement_date',
        'status',
        'payment_id',
        'created_by',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'settlement_amount' => 'decimal:2',
            'principal_amount' => 'decimal:2',
            'charge_amount' => 'decimal:2',
            'settlement_date' => 'date',
        ];
    }

    /** @return BelongsTo<Loan, $this> */
    public function reloanLoan(): BelongsTo
    {
        return $this->belongsTo(Loan::class, 'reloan_loan_id');
    }

    /** @return BelongsTo<Loan, $this> */
    public function oldLoan(): BelongsTo
    {
        return $this->belongsTo(Loan::class, 'old_loan_id');
    }

    /** @return BelongsTo<Payment, $this> */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
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
}
