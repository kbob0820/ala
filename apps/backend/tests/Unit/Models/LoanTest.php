<?php

use App\Enums\SettlementStatus;
use App\Models\Client;
use App\Models\Loan;
use App\Models\LoanSettlement;
use App\Models\Payment;
use App\Models\User;

/** @param  array<string, mixed>  $attributes */
function makeLoan(Client $client, array $attributes = []): Loan
{
    return Loan::create(array_merge([
        'client_id' => $client->id,
        'loan_type' => 'regular',
        'amount' => 10000,
        'total_interest' => 3000,
        'net_proceeds' => 7000,
        'installment_amount' => 1000,
        'total_installments' => 10,
    ], $attributes));
}

test('remaining balance reaches zero when a completed reloan settlement exists', function () {
    $client = Client::create(['name' => 'Borrower']);
    $user = User::factory()->create();

    $oldLoan = makeLoan($client, [
        'loan_status' => 'settled_by_reloan',
        'closed_at' => now(),
    ]);

    $reloan = makeLoan($client, [
        'loan_type' => 'reloan',
        'parent_loan_id' => $oldLoan->id,
        'loan_status' => 'active',
    ]);

    expect($oldLoan->fresh()->remaining_balance)->toBe(10000.0);

    $settlement = LoanSettlement::create([
        'reloan_loan_id' => $reloan->id,
        'old_loan_id' => $oldLoan->id,
        'settlement_amount' => 10000,
        'principal_amount' => 10000,
        'charge_amount' => 0,
        'settlement_date' => now()->toDateString(),
        'status' => SettlementStatus::Completed->value,
        'created_by' => $user->id,
    ]);

    expect($oldLoan->fresh()->remaining_balance)->toBe(0.0);

    $settlement->update(['status' => SettlementStatus::Voided->value]);

    expect($oldLoan->fresh()->remaining_balance)->toBe(10000.0);
});

test('remaining balance subtracts both payments and completed settlements', function () {
    $client = Client::create(['name' => 'Borrower']);
    $user = User::factory()->create();

    $oldLoan = makeLoan($client, ['loan_status' => 'settled_by_reloan', 'closed_at' => now()]);
    $reloan = makeLoan($client, ['loan_type' => 'reloan', 'parent_loan_id' => $oldLoan->id, 'loan_status' => 'active']);

    Payment::create([
        'loan_id' => $oldLoan->id,
        'client_id' => $client->id,
        'amount' => 2000,
        'payment_date' => now()->toDateString(),
    ]);

    LoanSettlement::create([
        'reloan_loan_id' => $reloan->id,
        'old_loan_id' => $oldLoan->id,
        'settlement_amount' => 8000,
        'principal_amount' => 8000,
        'charge_amount' => 0,
        'settlement_date' => now()->toDateString(),
        'status' => SettlementStatus::Completed->value,
        'created_by' => $user->id,
    ]);

    expect($oldLoan->fresh()->remaining_balance)->toBe(0.0);
});

test('remaining balance excludes charge portion of settlement and never goes negative', function () {
    $client = Client::create(['name' => 'Borrower']);
    $user = User::factory()->create();

    $oldLoan = makeLoan($client, ['loan_status' => 'settled_by_reloan', 'closed_at' => now()]);
    $reloan = makeLoan($client, ['loan_type' => 'reloan', 'parent_loan_id' => $oldLoan->id, 'loan_status' => 'active']);

    LoanSettlement::create([
        'reloan_loan_id' => $reloan->id,
        'old_loan_id' => $oldLoan->id,
        'settlement_amount' => 10500,
        'principal_amount' => 10000,
        'charge_amount' => 500,
        'settlement_date' => now()->toDateString(),
        'status' => SettlementStatus::Completed->value,
        'created_by' => $user->id,
    ]);

    expect($oldLoan->fresh()->remaining_balance)->toBe(0.0);
});
