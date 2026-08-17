<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $loan_id
 * @property int $client_id
 * @property float $amount
 * @property string $status
 * @property string $payment_method
 * @property string $payment_date
 * @property string|null $notes
 */
class Payment extends Model
{
    protected $fillable = [
        'loan_id',
        'client_id',
        'amount',
        'status',
        'payment_method',
        'payment_date',
        'notes',
        'proof_image',
    ];

    protected $appends = ['proof_image_url'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
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

    /** @return HasMany<PaymentAllocation, $this> */
    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    /** @return Attribute<mixed, mixed> */
    protected function proofImageUrl(): Attribute
    {
        return new Attribute(
            get: fn (): ?string => $this->proof_image
                ? Storage::disk('public')->url($this->proof_image)
                : null,
        );
    }
}
