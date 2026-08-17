<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property string $file_path
 * @property string $original_name
 * @property string $type
 * @property bool $ocr_verified
 * @property array<string, mixed>|null $ocr_data
 */
class Document extends Model
{
    protected $fillable = [
        'type',
        'file_path',
        'original_name',
        'ocr_verified',
        'ocr_data',
    ];

    protected function casts(): array
    {
        return [
            'ocr_verified' => 'boolean',
            'ocr_data' => 'array',
        ];
    }

    protected $appends = ['view_url'];

    /** @return MorphTo<Model, $this> */
    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return Attribute<mixed, mixed> */
    protected function viewUrl(): Attribute
    {
        return new Attribute(
            get: fn (): string => url('/api/documents/'.$this->id.'/view'),
        );
    }
}
