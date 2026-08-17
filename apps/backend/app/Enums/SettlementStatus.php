<?php

namespace App\Enums;

enum SettlementStatus: string
{
    case Completed = 'completed';
    case Voided = 'voided';

    public function label(): string
    {
        return match ($this) {
            self::Completed => 'Completed',
            self::Voided => 'Voided',
        };
    }
}
