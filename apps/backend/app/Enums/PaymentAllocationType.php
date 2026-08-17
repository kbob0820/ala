<?php

namespace App\Enums;

enum PaymentAllocationType: string
{
    case LateFee = 'LATE_FEE';
    case OtherCharge = 'OTHER_CHARGE';
    case PastDue = 'PAST_DUE';
    case Current = 'CURRENT';

    public function label(): string
    {
        return match ($this) {
            self::LateFee => 'Late Fee',
            self::OtherCharge => 'Other Charge',
            self::PastDue => 'Past Due',
            self::Current => 'Current',
        };
    }
}
