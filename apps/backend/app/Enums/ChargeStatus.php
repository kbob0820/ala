<?php

namespace App\Enums;

enum ChargeStatus: string
{
    case Assessed = 'ASSESSED';
    case PartiallyPaid = 'PARTIALLY_PAID';
    case Paid = 'PAID';
    case Waived = 'WAIVED';
    case Reversed = 'REVERSED';

    public function label(): string
    {
        return match ($this) {
            self::Assessed => 'Assessed',
            self::PartiallyPaid => 'Partially Paid',
            self::Paid => 'Paid',
            self::Waived => 'Waived',
            self::Reversed => 'Reversed',
        };
    }

    /** @return array<int, string> */
    public static function unpaidStatuses(): array
    {
        return [
            self::Assessed->value,
            self::PartiallyPaid->value,
        ];
    }
}
