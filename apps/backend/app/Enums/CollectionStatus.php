<?php

namespace App\Enums;

enum CollectionStatus: string
{
    case ReminderSent = 'reminder_sent';
    case PromiseToPay = 'promise_to_pay';
    case UnderCollection = 'under_collection';
    case LegalAction = 'legal_action';
    case Settled = 'settled';

    public function label(): string
    {
        return match ($this) {
            self::ReminderSent => 'Reminder Sent',
            self::PromiseToPay => 'Promise to Pay',
            self::UnderCollection => 'Under Collection',
            self::LegalAction => 'Legal Action',
            self::Settled => 'Settled',
        };
    }
}
