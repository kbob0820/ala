<?php

namespace App\Enums;

enum ChargeType: string
{
    case LateFee = 'LATE_FEE';
    case TransferFee = 'TRANSFER_FEE';
    case OtherCharge = 'OTHER_CHARGE';

    public function label(): string
    {
        return match ($this) {
            self::LateFee => 'Late Fee',
            self::TransferFee => 'Transfer Fee',
            self::OtherCharge => 'Other Charge',
        };
    }
}
