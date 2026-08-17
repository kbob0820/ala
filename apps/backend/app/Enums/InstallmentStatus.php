<?php

namespace App\Enums;

enum InstallmentStatus: string
{
    case Pending = 'pending';
    case Due = 'due';
    case PartiallyPaid = 'partially_paid';
    case Paid = 'paid';
    case PastDue = 'past_due';
    case Cancelled = 'cancelled';
    case Waived = 'waived';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Upcoming',
            self::Due => 'Due',
            self::PartiallyPaid => 'Partially Paid',
            self::Paid => 'Paid',
            self::PastDue => 'Past Due',
            self::Cancelled => 'Cancelled',
            self::Waived => 'Waived',
        };
    }

    /** @return array<int, string> */
    public static function unpaidStatuses(): array
    {
        return [
            self::Pending->value,
            self::Due->value,
            self::PartiallyPaid->value,
            self::PastDue->value,
        ];
    }

    /** @return array<int, string> */
    public static function overdueStatuses(): array
    {
        return self::unpaidStatuses();
    }
}
