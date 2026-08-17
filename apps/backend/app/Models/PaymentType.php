<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property string $category
 * @property bool $is_active
 * @property float|null $fee
 */
class PaymentType extends Model
{
    protected $fillable = [
        'name',
        'category',
        'is_active',
        'fee',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'fee' => 'decimal:2',
        ];
    }
}
