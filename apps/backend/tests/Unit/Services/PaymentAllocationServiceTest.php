<?php

use App\Models\Client;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanInstallment;
use App\Models\Payment;
use App\Services\PaymentAllocationService;

function makeAllocationLoan(Client $client, array $schedule): Loan
{
    $loan = Loan::create([
        'client_id' => $client->id,
        'loan_type' => 'regular',
        'amount' => array_sum(array_column($schedule, 'amount')),
        'total_interest' => 0,
        'net_proceeds' => array_sum(array_column($schedule, 'amount')),
        'installment_amount' => $schedule[0]['amount'],
        'total_installments' => count($schedule),
        'loan_status' => 'active',
    ]);

    foreach ($schedule as $index => $item) {
        $loan->installments()->create([
            'installment_number' => $index + 1,
            'due_date' => $item['due_date'],
            'amount' => $item['amount'],
            'status' => 'pending',
        ]);
    }

    return $loan;
}

function makeCharge(Loan $loan, string $type, float $amount, ?LoanInstallment $installment = null): LoanCharge
{
    return LoanCharge::create([
        'loan_id' => $loan->id,
        'loan_installment_id' => $installment?->id,
        'client_id' => $loan->client_id,
        'charge_type' => $type,
        'description' => $type,
        'original_amount' => $amount,
        'paid_amount' => 0,
        'waived_amount' => 0,
        'balance' => $amount,
        'assessment_date' => now()->toDateString(),
        'status' => 'ASSESSED',
        'reference' => uniqid('CHG-'),
    ]);
}

test('payment allocates in priority order: late fee, other charge, past-due, current', function () {
    $client = Client::create(['name' => 'Borrower']);

    $loan = makeAllocationLoan($client, [
        ['due_date' => now()->subDays(10)->toDateString(), 'amount' => 2500],
        ['due_date' => now()->subDays(3)->toDateString(), 'amount' => 2500],
        ['due_date' => now()->addDays(5)->toDateString(), 'amount' => 2500],
        ['due_date' => now()->addDays(20)->toDateString(), 'amount' => 2500],
    ]);

    $pastDueInstallment = $loan->installments()->where('installment_number', 1)->first();

    makeCharge($loan, 'LATE_FEE', 500, $pastDueInstallment);
    makeCharge($loan, 'OTHER_CHARGE', 200);

    $payment = Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 3000,
        'payment_date' => now()->toDateString(),
    ]);

    $result = app(PaymentAllocationService::class)->allocate($payment);

    $types = array_column($result['allocations'], 'allocation_type');

    expect($types)->toBe(['LATE_FEE', 'OTHER_CHARGE', 'PAST_DUE']);
    expect($result['excess'])->toBe(0.0);

    $lateFee = $loan->charges()->where('charge_type', 'LATE_FEE')->first();
    $otherCharge = $loan->charges()->where('charge_type', 'OTHER_CHARGE')->first();

    expect((float) $lateFee->fresh()->balance)->toBe(0.0);
    expect($lateFee->fresh()->status)->toBe('PAID');
    expect((float) $otherCharge->fresh()->balance)->toBe(0.0);

    $pastDueInstallment->refresh();
    expect((float) $pastDueInstallment->paid_amount)->toBe(2300.0);
    expect($pastDueInstallment->status)->toBe('partially_paid');
});

test('payment of 5500 fully settles a 5000 past-due schedule and 500 late fee', function () {
    $client = Client::create(['name' => 'Borrower']);

    $loan = makeAllocationLoan($client, [
        ['due_date' => now()->subDays(5)->toDateString(), 'amount' => 5000],
    ]);

    $installment = $loan->installments()->first();
    makeCharge($loan, 'LATE_FEE', 500, $installment);

    $payment = Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 5500,
        'payment_date' => now()->toDateString(),
    ]);

    $result = app(PaymentAllocationService::class)->allocate($payment);

    expect($result['excess'])->toBe(0.0);

    $installment->refresh();
    expect($installment->status)->toBe('paid');
    expect((float) $installment->paid_amount)->toBe(5000.0);

    expect($loan->charges()->where('charge_type', 'LATE_FEE')->first()->status)->toBe('PAID');
});

test('payment of 5200 leaves 300 past-due remaining', function () {
    $client = Client::create(['name' => 'Borrower']);

    $loan = makeAllocationLoan($client, [
        ['due_date' => now()->subDays(5)->toDateString(), 'amount' => 5000],
    ]);

    $installment = $loan->installments()->first();
    makeCharge($loan, 'LATE_FEE', 500, $installment);

    $payment = Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 5200,
        'payment_date' => now()->toDateString(),
    ]);

    $result = app(PaymentAllocationService::class)->allocate($payment);

    expect($result['excess'])->toBe(0.0);

    $installment->refresh();
    expect((float) $installment->paid_amount)->toBe(4700.0);
    expect($installment->remainingAmount())->toBe(300.0);
    expect($installment->status)->toBe('partially_paid');
});

test('payment of 6000 produces a refundable excess of 500', function () {
    $client = Client::create(['name' => 'Borrower']);

    $loan = makeAllocationLoan($client, [
        ['due_date' => now()->subDays(5)->toDateString(), 'amount' => 5000],
    ]);

    $installment = $loan->installments()->first();
    makeCharge($loan, 'LATE_FEE', 500, $installment);

    $payment = Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 6000,
        'payment_date' => now()->toDateString(),
    ]);

    $result = app(PaymentAllocationService::class)->allocate($payment);

    expect($result['excess'])->toBe(500.0);

    $installment->refresh();
    expect($installment->status)->toBe('paid');
    expect($loan->charges()->where('charge_type', 'LATE_FEE')->first()->status)->toBe('PAID');
});

test('reversing a payment restores charge and installment balances', function () {
    $client = Client::create(['name' => 'Borrower']);

    $loan = makeAllocationLoan($client, [
        ['due_date' => now()->subDays(5)->toDateString(), 'amount' => 5000],
    ]);

    $installment = $loan->installments()->first();
    makeCharge($loan, 'LATE_FEE', 500, $installment);

    $payment = Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 5500,
        'payment_date' => now()->toDateString(),
    ]);

    app(PaymentAllocationService::class)->allocate($payment);

    expect($installment->fresh()->status)->toBe('paid');

    app(PaymentAllocationService::class)->reverse($payment);

    $installment->refresh();
    $lateFee = $loan->charges()->where('charge_type', 'LATE_FEE')->first();

    expect((float) $installment->paid_amount)->toBe(0.0);
    expect($installment->status)->toBe('past_due');
    expect((float) $lateFee->paid_amount)->toBe(0.0);
    expect($lateFee->status)->toBe('ASSESSED');
});
