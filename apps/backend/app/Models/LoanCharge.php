<?php

namespace App\Models;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $loan_id
 * @property int|null $loan_installment_id
 * @property int $client_id
 * @property string $charge_type
 * @property string|null $description
 * @property float $original_amount
 * @property float $paid_amount
 * @property float $waived_amount
 * @property float $balance
 * @property float|null $requested_waive_amount
 * @property string $assessment_date
 * @property string|null $due_date
 * @property string $status
 * @property string $reference
 * @property string|null $reason
 * @property int|null $requested_by
 * @property int|null $approved_by
 * @property Carbon|null $approved_at
 * @property int|null $reversed_by
 * @property Carbon|null $reversed_at
 * @property int|null $created_by
 * @property int|null $updated_by
 */
class LoanCharge extends Model
{
    use SoftDeletes;

    protected $table = 'loan_charges';

    protected $fillable = [
        'loan_id',
        'loan_installment_id',
        'client_id',
        'charge_type',
        'description',
        'original_amount',
        'paid_amount',
        'waived_amount',
        'balance',
        'requested_waive_amount',
        'assessment_date',
        'due_date',
        'status',
        'reference',
        'reason',
        'requested_by',
        'approved_by',
        'approved_at',
        'reversed_by',
        'reversed_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'original_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'waived_amount' => 'decimal:2',
            'balance' => 'decimal:2',
            'requested_waive_amount' => 'decimal:2',
            'assessment_date' => 'date',
            'due_date' => 'date',
            'approved_at' => 'datetime',
            'reversed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Loan, $this> */
    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    /** @return BelongsTo<LoanInstallment, $this> */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(LoanInstallment::class, 'loan_installment_id');
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<User, $this> */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /** @return BelongsTo<User, $this> */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** @return BelongsTo<User, $this> */
    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** @return HasMany<PaymentAllocation, $this> */
    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class, 'charge_id');
    }

    public function isLateFee(): bool
    {
        return $this->charge_type === ChargeType::LateFee->value;
    }

    public function isOutstanding(): bool
    {
        return in_array($this->status, ChargeStatus::unpaidStatuses(), true);
    }

    public function recalculateBalance(): void
    {
        $this->balance = round((float) $this->original_amount - (float) $this->paid_amount - (float) $this->waived_amount, 2);
    }
}
