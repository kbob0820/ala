<?php

namespace App\Enums;

enum UserRole: string
{
    case Administrator = 'administrator';
    case LoanOfficer = 'loan_officer';
    case Approver = 'approver';
    case Cashier = 'cashier';
    case Collector = 'collector';
    case Auditor = 'auditor';
    case Borrower = 'borrower';

    public function label(): string
    {
        return match ($this) {
            self::Administrator => 'Administrator',
            self::LoanOfficer => 'Loan Officer',
            self::Approver => 'Approver',
            self::Cashier => 'Cashier',
            self::Collector => 'Collector',
            self::Auditor => 'Auditor',
            self::Borrower => 'Borrower',
        };
    }

    /** @return array<int, array{slug: string, name: string, description: string}> */
    public static function seedData(): array
    {
        return [
            ['slug' => self::Administrator->value, 'name' => self::Administrator->label(), 'description' => 'Full system access and configuration'],
            ['slug' => self::LoanOfficer->value, 'name' => self::LoanOfficer->label(), 'description' => 'Borrower management and loan origination'],
            ['slug' => self::Approver->value, 'name' => self::Approver->label(), 'description' => 'Application review and approval'],
            ['slug' => self::Cashier->value, 'name' => self::Cashier->label(), 'description' => 'Loan release and payment processing'],
            ['slug' => self::Collector->value, 'name' => self::Collector->label(), 'description' => 'Delinquency follow-up and collections'],
            ['slug' => self::Auditor->value, 'name' => self::Auditor->label(), 'description' => 'Read-only access to transactions and logs'],
            ['slug' => self::Borrower->value, 'name' => self::Borrower->label(), 'description' => 'View own loans and make payments'],
        ];
    }
}
