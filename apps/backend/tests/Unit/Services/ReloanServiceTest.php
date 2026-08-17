<?php

use App\Enums\SettlementStatus;
use App\Models\Client;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanSettlement;
use App\Models\Payment;
use App\Models\User;
use App\Services\ReloanService;

test('auto close records split principal and charge settlement amounts', function () {
    $client = Client::create(['name' => 'Borrower']);
    $user = User::factory()->create();

    $oldLoan = Loan::create([
        'client_id' => $client->id,
        'loan_type' => 'regular',
        'amount' => 25000,
        'total_interest' => 0,
        'net_proceeds' => 25000,
        'installment_amount' => 6250,
        'total_installments' => 4,
        'loan_status' => 'active',
    ]);

    Payment::create([
        'loan_id' => $oldLoan->id,
        'client_id' => $client->id,
        'amount' => 10000,
        'payment_date' => now()->toDateString(),
    ]);

    LoanCharge::create([
        'loan_id' => $oldLoan->id,
        'client_id' => $client->id,
        'charge_type' => 'LATE_FEE',
        'original_amount' => 1000,
        'paid_amount' => 0,
        'waived_amount' => 0,
        'balance' => 1000,
        'assessment_date' => now()->toDateString(),
        'status' => 'ASSESSED',
        'reference' => 'LF-test',
    ]);

    $reloan = Loan::create([
        'client_id' => $client->id,
        'parent_loan_id' => $oldLoan->id,
        'loan_type' => 'reloan',
        'amount' => 25000,
        'total_interest' => 0,
        'net_proceeds' => 25000,
        'installment_amount' => 6250,
        'total_installments' => 4,
        'old_balance_settlement' => 15000,
        'loan_status' => 'waiting_for_release',
        'created_by' => $user->id,
    ]);

    app(ReloanService::class)->autoCloseOldLoans($reloan, $user->id);

    $settlement = LoanSettlement::where('reloan_loan_id', $reloan->id)->first();

    expect($settlement)->not->toBeNull();
    expect((float) $settlement->principal_amount)->toBe(15000.0);
    expect((float) $settlement->charge_amount)->toBe(1000.0);
    expect((float) $settlement->settlement_amount)->toBe(16000.0);
    expect($settlement->status)->toBe(SettlementStatus::Completed->value);

    $oldLoan->refresh();
    expect($oldLoan->loan_status)->toBe('settled_by_reloan');
    expect($oldLoan->remaining_balance)->toBe(0.0);
});
