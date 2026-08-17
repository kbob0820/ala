<?php

use App\Models\Client;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanInstallment;
use App\Models\User;
use App\Services\ChargeService;

function makeChargeLoan(Client $client): Loan
{
    return Loan::create([
        'client_id' => $client->id,
        'loan_type' => 'regular',
        'amount' => 10000,
        'total_interest' => 0,
        'net_proceeds' => 10000,
        'installment_amount' => 5000,
        'total_installments' => 2,
        'loan_status' => 'active',
    ]);
}

function makeChargeInstallment(Loan $loan, string $dueDate): LoanInstallment
{
    return $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => $dueDate,
        'amount' => 5000,
        'status' => 'pending',
    ]);
}

test('assessing a late fee creates a single charge with the configured amount', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makeChargeLoan($client);
    $installment = makeChargeInstallment($loan, now()->subDays(5)->toDateString());

    $charge = app(ChargeService::class)->assessLateFee($installment);

    expect($charge)->not->toBeNull();
    expect($charge->charge_type)->toBe('LATE_FEE');
    expect((float) $charge->original_amount)->toBe(500.0);
    expect((float) $charge->balance)->toBe(500.0);
    expect($charge->status)->toBe('ASSESSED');
    expect($charge->reference)->toBe("LF-{$installment->id}");
});

test('assessing a late fee twice does not create a duplicate', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makeChargeLoan($client);
    $installment = makeChargeInstallment($loan, now()->subDays(5)->toDateString());

    $service = app(ChargeService::class);

    $first = $service->assessLateFee($installment);
    $second = $service->assessLateFee($installment);

    expect($first)->not->toBeNull();
    expect($second)->toBeNull();
    expect(LoanCharge::where('loan_installment_id', $installment->id)->count())->toBe(1);
});

test('waiving a late fee reduces the balance without deleting the transaction', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makeChargeLoan($client);
    $installment = makeChargeInstallment($loan, now()->subDays(5)->toDateString());

    $requester = User::factory()->create();
    $approver = User::factory()->create();

    $service = app(ChargeService::class);
    $charge = $service->assessLateFee($installment);

    $service->requestWaiver($charge, 200, 'Customer goodwill', $requester->id);
    $service->approveWaiver($charge, 200, $approver->id);

    $charge->refresh();

    expect((float) $charge->original_amount)->toBe(500.0);
    expect((float) $charge->waived_amount)->toBe(200.0);
    expect((float) $charge->balance)->toBe(300.0);
    expect($charge->status)->toBe('ASSESSED');
});

test('fully waiving a late fee sets status to WAIVED', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makeChargeLoan($client);
    $installment = makeChargeInstallment($loan, now()->subDays(5)->toDateString());

    $approver = User::factory()->create();

    $service = app(ChargeService::class);
    $charge = $service->assessLateFee($installment);

    $service->approveWaiver($charge, 500, $approver->id);

    $charge->refresh();

    expect((float) $charge->balance)->toBe(0.0);
    expect($charge->status)->toBe('WAIVED');
});

test('reversing a late fee allows a fresh assessment under a new reference', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makeChargeLoan($client);
    $installment = makeChargeInstallment($loan, now()->subDays(5)->toDateString());

    $approver = User::factory()->create();

    $service = app(ChargeService::class);
    $charge = $service->assessLateFee($installment);

    $service->reverse($charge, 'Erroneous assessment', $approver->id);

    expect($charge->fresh()->status)->toBe('REVERSED');

    $reassessed = $service->assessLateFee($installment);

    expect($reassessed)->not->toBeNull();
    expect($reassessed->reference)->toBe("LF-{$installment->id}-2");
    expect(LoanCharge::where('loan_installment_id', $installment->id)->count())->toBe(2);
});

test('assessing a manual charge records the requested type and amount', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makeChargeLoan($client);

    $charge = app(ChargeService::class)->assessManualCharge($loan, [
        'charge_type' => 'TRANSFER_FEE',
        'amount' => 150,
        'description' => 'Bank transfer fee',
    ]);

    expect($charge->charge_type)->toBe('TRANSFER_FEE');
    expect((float) $charge->original_amount)->toBe(150.0);
    expect($charge->status)->toBe('ASSESSED');
});
