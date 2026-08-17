<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property string $name
 * @property string|null $photo
 */
class Client extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'address',
        'work',
        'work_address',
        'contact_number',
        'social_media',
        'notes',
        'photo',
    ];

    protected $appends = ['photo_url', 'loans_by_status', 'is_active'];

    protected function casts(): array
    {
        return [
            'social_media' => 'array',
        ];
    }

    /** @return Attribute<mixed, mixed> */
    protected function photoUrl(): Attribute
    {
        return new Attribute(
            get: fn (): ?string => $this->photo ? Storage::disk('public')->url($this->photo) : null,
        );
    }

    /** @return Attribute<mixed, mixed> */
    protected function isActive(): Attribute
    {
        return new Attribute(
            get: fn (): bool => $this->deleted_at === null,
        );
    }

    /** @return MorphMany<Document, $this> */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /** @return HasMany<Loan, $this> */
    public function loans(): HasMany
    {
        return $this->hasMany(Loan::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getLoansByStatusAttribute(): string
    {
        return $this->loans
            ->groupBy(fn ($loan) => $loan->loan_status ?? $loan->application_status)
            ->map(fn ($group) => $group->count())
            ->sortKeys()
            ->map(fn ($count, $status) => "{$status}: {$count}")
            ->implode(', ');
    }
}
