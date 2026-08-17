<?php

namespace App\Enums;

enum LoanStatus: string
{
    case WaitingForRelease = 'waiting_for_release';
    case Released = 'released';
    case Active = 'active';
    case PastDue = 'past_due';
    case Delinquent = 'delinquent';
    case Restructured = 'restructured';
    case FullyPaid = 'fully_paid';
    case SettledByReloan = 'settled_by_reloan';
    case Closed = 'closed';
    case Defaulted = 'defaulted';

    public function label(): string
    {
        return match ($this) {
            self::WaitingForRelease => 'Waiting for Release',
            self::Released => 'Released',
            self::Active => 'Active',
            self::PastDue => 'Past Due',
            self::Delinquent => 'Delinquent',
            self::SettledByReloan => 'Settled by Reloan',
            self::Restructured => 'Restructured',
            self::FullyPaid => 'Fully Paid',
            self::Closed => 'Closed',
            self::Defaulted => 'Defaulted',
        };
    }

    /** @return array<int, string> */
    public static function activeStatuses(): array
    {
        return [
            self::Active->value,
            self::PastDue->value,
            self::Delinquent->value,
        ];
    }
}
