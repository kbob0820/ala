<?php

namespace App\Enums;

enum RefundStatus: string
{
    case Requested = 'requested';
    case Verified = 'verified';
    case Approved = 'approved';
    case Released = 'released';
    case Completed = 'completed';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Requested => 'Requested',
            self::Verified => 'Verified',
            self::Approved => 'Approved',
            self::Released => 'Released',
            self::Completed => 'Completed',
            self::Rejected => 'Rejected',
        };
    }
}
