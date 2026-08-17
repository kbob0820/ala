<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $loan_id
 * @property int $client_id
 * @property float $amount
 * @property string $reason
 * @property string $status
 * @property int|null $verified_by
 * @property int|null $approved_by
 * @property int|null $released_by
 * @property Carbon|null $verified_at
 * @property Carbon|null $approved_at
 * @property Carbon|null $released_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $rejected_at
 * @property string|null $notes
 * @property string|null $release_method
 */
class Refund extends Model
{
    protected $table = 'refunds';

    protected $fillable = [
        'loan_id',
        'client_id',
        'amount',
        'reason',
        'status',
        'verified_by',
        'approved_by',
        'released_by',
        'verified_at',
        'approved_at',
        'released_at',
        'completed_at',
        'rejected_at',
        'notes',
        'release_method',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'verified_at' => 'datetime',
            'approved_at' => 'datetime',
            'released_at' => 'datetime',
            'completed_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Loan, $this> */
    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<User, $this> */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /** @return BelongsTo<User, $this> */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** @return BelongsTo<User, $this> */
    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }
}
