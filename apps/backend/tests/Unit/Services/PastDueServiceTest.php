<?php

use App\Models\Client;
use App\Models\Loan;
use App\Models\Setting;
use App\Models\User;
use App\Services\PastDueService;

function makePastDueLoan(Client $client, string $dueDate): Loan
{
    $loan = Loan::create([
        'client_id' => $client->id,
        'loan_type' => 'regular',
        'amount' => 10000,
        'total_interest' => 0,
        'net_proceeds' => 10000,
        'installment_amount' => 5000,
        'total_installments' => 2,
        'loan_status' => 'active',
    ]);

    $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => $dueDate,
        'amount' => 5000,
        'status' => 'pending',
    ]);

    $loan->installments()->create([
        'installment_number' => 2,
        'due_date' => now()->addDays(10)->toDateString(),
        'amount' => 5000,
        'status' => 'pending',
    ]);

    return $loan;
}

test('processing past-due marks the schedule and assesses one late fee', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    $result = app(PastDueService::class)->process();

    expect($result['past_due_marked'])->toBe(1);
    expect($result['late_fees_assessed'])->toBe(1);

    $installment = $loan->installments()->where('installment_number', 1)->first();
    expect($installment->status)->toBe('past_due');
    expect($installment->charges()->where('charge_type', 'LATE_FEE')->count())->toBe(1);

    $loan->refresh();
    expect($loan->loan_status)->toBe('past_due');
});

test('processing twice is idempotent and never duplicates a late fee', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    $service = app(PastDueService::class);

    $service->process();
    $second = $service->process();

    expect($second['late_fees_assessed'])->toBe(0);

    $installment = $loan->installments()->where('installment_number', 1)->first();
    expect($installment->charges()->where('charge_type', 'LATE_FEE')->count())->toBe(1);
});

test('grace period defers past-due status until the grace window passes', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    Setting::create([
        'key' => 'late_fee_grace_days',
        'value' => '5',
        'group' => 'loans',
    ]);

    $result = app(PastDueService::class)->process();

    expect($result['past_due_marked'])->toBe(0);
    expect($result['late_fees_assessed'])->toBe(0);
});

test('payment on the due date is not past due with zero grace', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->toDateString());

    $result = app(PastDueService::class)->process();

    expect($result['past_due_marked'])->toBe(0);
});

test('undo reverts installment, reverses late fee, and restores loan to active', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    $user = User::factory()->create();

    $service = app(PastDueService::class);
    $service->process();

    $result = $service->undo($loan, $user->id);

    expect($result['late_fees_reversed'])->toBe(1);
    expect($result['installments_reverted'])->toBe(1);
    expect($result['loans_reverted'])->toBe(1);

    $installment = $loan->installments()->where('installment_number', 1)->first();
    expect($installment->status)->toBe('due');

    $charge = $installment->charges()->where('charge_type', 'LATE_FEE')->first();
    expect($charge->status)->toBe('REVERSED');

    $loan->refresh();
    expect($loan->loan_status)->toBe('active');
});

test('undo leaves paid late fees intact', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    $service = app(PastDueService::class);
    $service->process();

    $installment = $loan->installments()->where('installment_number', 1)->first();
    $charge = $installment->charges()->where('charge_type', 'LATE_FEE')->first();
    $charge->update(['paid_amount' => 500, 'balance' => 0, 'status' => 'PAID']);

    $result = $service->undo($loan);

    expect($result['late_fees_reversed'])->toBe(0);
    expect($charge->refresh()->status)->toBe('PAID');
});

test('processLoan assesses a custom late fee amount', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    $user = User::factory()->create();
    $service = app(PastDueService::class);

    $overdue = $loan->installments()->where('installment_number', 1)->first();

    $result = $service->processLoan($loan, [
        ['id' => $overdue->id, 'late_fee' => 250],
    ], $user->id);

    expect($result['past_due_marked'])->toBe(1);
    expect($result['late_fees_assessed'])->toBe(1);

    $charge = $overdue->charges()->where('charge_type', 'LATE_FEE')->first();
    expect((float) $charge->original_amount)->toBe(250.0);
    expect($overdue->refresh()->status)->toBe('past_due');
    expect($loan->refresh()->loan_status)->toBe('past_due');
});

test('processLoan skips the fee when amount is zero but still marks past due', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    $user = User::factory()->create();
    $service = app(PastDueService::class);

    $overdue = $loan->installments()->where('installment_number', 1)->first();

    $result = $service->processLoan($loan, [
        ['id' => $overdue->id, 'late_fee' => 0],
    ], $user->id);

    expect($result['past_due_marked'])->toBe(1);
    expect($result['late_fees_assessed'])->toBe(0);
    expect($overdue->charges()->where('charge_type', 'LATE_FEE')->count())->toBe(0);
    expect($overdue->refresh()->status)->toBe('past_due');
});

test('updateLateFee changes the amount of an outstanding late fee', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = makePastDueLoan($client, now()->subDays(3)->toDateString());

    $user = User::factory()->create();
    $service = app(PastDueService::class);
    $service->process();

    $installment = $loan->installments()->where('installment_number', 1)->first();
    $charge = $installment->charges()->where('charge_type', 'LATE_FEE')->first();

    $updated = $service->updateLateFee($installment, 750.0, $user->id);

    expect((float) $updated->original_amount)->toBe(750.0);
    expect((float) $updated->balance)->toBe(750.0);
    expect($charge->refresh()->status)->toBe('ASSESSED');
});
