<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $loan_id
 * @property string $release_method
 * @property float $amount
 * @property float $fee
 * @property string|null $proof_image
 * @property string|null $notes
 * @property string|null $release_date
 */
class LoanReleaseSource extends Model
{
    protected $table = 'loan_release_sources';

    protected $fillable = [
        'loan_id',
        'release_method',
        'amount',
        'fee',
        'proof_image',
        'notes',
        'release_date',
    ];

    protected $appends = ['proof_image_url'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'fee' => 'decimal:2',
            'release_date' => 'date',
        ];
    }

    /** @return BelongsTo<Loan, $this> */
    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
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
