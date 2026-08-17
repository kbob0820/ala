<?php

use App\Enums\UserRole;
use App\Models\Client;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Role;
use App\Models\User;

beforeEach(function () {
    Role::insert(UserRole::seedData());
});

function featureUser(string $role): User
{
    return User::factory()->create([
        'role_id' => Role::where('slug', $role)->first()->id,
        'is_active' => true,
    ]);
}

function featureBearer(User $user): array
{
    return ['Authorization' => 'Bearer '.$user->createToken('auth-token')->plainTextToken];
}

function featureLoan(Client $client): Loan
{
    return Loan::create([
        'client_id' => $client->id,
        'loan_type' => 'regular',
        'amount' => 5000,
        'total_interest' => 0,
        'net_proceeds' => 5000,
        'installment_amount' => 5000,
        'total_installments' => 1,
        'loan_status' => 'active',
    ]);
}

test('admin can read and update late fee settings', function () {
    $admin = featureUser(UserRole::Administrator->value);

    $this->withHeaders(featureBearer($admin))
        ->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('data.late_fee_amount', 500);

    $this->withHeaders(featureBearer($admin))
        ->putJson('/api/settings', ['late_fee_amount' => 600, 'late_fee_grace_days' => 2])
        ->assertOk()
        ->assertJsonPath('data.late_fee_amount', 600)
        ->assertJsonPath('data.late_fee_grace_days', 2);
});

test('non-admin cannot update settings', function () {
    $collector = featureUser(UserRole::Collector->value);

    $this->withHeaders(featureBearer($collector))
        ->putJson('/api/settings', ['late_fee_amount' => 600])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'FORBIDDEN');
});

test('collector cannot assess a manual charge', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $collector = featureUser(UserRole::Collector->value);

    $this->withHeaders(featureBearer($collector))
        ->postJson("/api/loans/{$loan->id}/charges", ['charge_type' => 'OTHER_CHARGE', 'amount' => 100])
        ->assertForbidden();
});

test('admin can assess a manual charge', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $admin = featureUser(UserRole::Administrator->value);

    $this->withHeaders(featureBearer($admin))
        ->postJson("/api/loans/{$loan->id}/charges", ['charge_type' => 'OTHER_CHARGE', 'amount' => 100])
        ->assertCreated()
        ->assertJsonPath('data.charge_type', 'OTHER_CHARGE');
});

test('collector cannot approve a waiver', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $charge = LoanCharge::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'charge_type' => 'LATE_FEE',
        'original_amount' => 500,
        'paid_amount' => 0,
        'waived_amount' => 0,
        'balance' => 500,
        'assessment_date' => now()->toDateString(),
        'status' => 'ASSESSED',
        'reference' => 'LF-TEST-1',
    ]);

    $collector = featureUser(UserRole::Collector->value);

    $this->withHeaders(featureBearer($collector))
        ->postJson("/api/charges/{$charge->id}/waiver/approve", ['waive_amount' => 200])
        ->assertForbidden();
});

test('approver can approve a waiver', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $charge = LoanCharge::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'charge_type' => 'LATE_FEE',
        'original_amount' => 500,
        'paid_amount' => 0,
        'waived_amount' => 0,
        'balance' => 500,
        'assessment_date' => now()->toDateString(),
        'status' => 'ASSESSED',
        'reference' => 'LF-TEST-2',
    ]);

    $approver = featureUser(UserRole::Approver->value);

    $this->withHeaders(featureBearer($approver))
        ->postJson("/api/charges/{$charge->id}/waiver/approve", ['waive_amount' => 200])
        ->assertOk()
        ->assertJsonPath('data.waived_amount', '200.00')
        ->assertJsonPath('data.balance', '300.00');
});

test('collector cannot reverse a payment', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $payment = Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 1000,
        'payment_date' => now()->toDateString(),
    ]);

    $collector = featureUser(UserRole::Collector->value);

    $this->withHeaders(featureBearer($collector))
        ->postJson("/api/loans/{$loan->id}/payments/{$payment->id}/reverse")
        ->assertForbidden();
});

test('approver can reverse a payment', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $payment = Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 1000,
        'payment_date' => now()->toDateString(),
    ]);

    $approver = featureUser(UserRole::Approver->value);

    $this->withHeaders(featureBearer($approver))
        ->postJson("/api/loans/{$loan->id}/payments/{$payment->id}/reverse")
        ->assertOk()
        ->assertJsonPath('data.payment.status', 'reversed');
});

test('cashier can detect overpayment and request a refund', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    Payment::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 5500,
        'payment_date' => now()->toDateString(),
    ]);

    $cashier = featureUser(UserRole::Cashier->value);

    $this->withHeaders(featureBearer($cashier))
        ->getJson("/api/loans/{$loan->id}/overpayment")
        ->assertOk()
        ->assertJsonPath('data.refundable_overpayment', 500);

    $this->withHeaders(featureBearer($cashier))
        ->postJson("/api/loans/{$loan->id}/refunds", ['amount' => 500, 'reason' => 'Overpayment'])
        ->assertCreated()
        ->assertJsonPath('data.status', 'requested');
});

test('approver can approve a refund', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $refund = Refund::create([
        'loan_id' => $loan->id,
        'client_id' => $client->id,
        'amount' => 500,
        'reason' => 'Overpayment',
        'status' => 'requested',
    ]);

    $approver = featureUser(UserRole::Approver->value);

    $this->withHeaders(featureBearer($approver))
        ->postJson("/api/refunds/{$refund->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');
});

test('collector cannot undo past-due processing', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $collector = featureUser(UserRole::Collector->value);

    $this->withHeaders(featureBearer($collector))
        ->postJson("/api/loans/{$loan->id}/past-due/undo")
        ->assertForbidden()
        ->assertJsonPath('error.code', 'FORBIDDEN');
});

test('approver can undo past-due processing', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $installment = $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => now()->subDays(3)->toDateString(),
        'amount' => 5000,
        'status' => 'past_due',
    ]);

    LoanCharge::create([
        'loan_id' => $loan->id,
        'loan_installment_id' => $installment->id,
        'client_id' => $client->id,
        'charge_type' => 'LATE_FEE',
        'original_amount' => 500,
        'paid_amount' => 0,
        'waived_amount' => 0,
        'balance' => 500,
        'assessment_date' => now()->toDateString(),
        'status' => 'ASSESSED',
        'reference' => 'LF-FEATURE-1',
    ]);

    $loan->update(['loan_status' => 'past_due']);

    $approver = featureUser(UserRole::Approver->value);

    $this->withHeaders(featureBearer($approver))
        ->postJson("/api/loans/{$loan->id}/past-due/undo")
        ->assertOk()
        ->assertJsonPath('data.late_fees_reversed', 1)
        ->assertJsonPath('data.installments_reverted', 1)
        ->assertJsonPath('data.loans_reverted', 1);

    expect($loan->refresh()->loan_status)->toBe('active');
    expect($installment->refresh()->status)->toBe('due');
});

test('past-due listing includes defaulted loans', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => now()->subDays(100)->toDateString(),
        'amount' => 5000,
        'status' => 'past_due',
    ]);

    $loan->update(['loan_status' => 'defaulted']);

    $admin = featureUser(UserRole::Administrator->value);

    $this->withHeaders(featureBearer($admin))
        ->getJson('/api/loans/past-due')
        ->assertOk()
        ->assertJsonPath('data.data.0.id', $loan->id)
        ->assertJsonPath('data.data.0.loan_status', 'defaulted');
});

test('approver can process past-due for a loan with a custom fee', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $installment = $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => now()->subDays(3)->toDateString(),
        'amount' => 5000,
        'status' => 'pending',
    ]);

    $approver = featureUser(UserRole::Approver->value);

    $this->withHeaders(featureBearer($approver))
        ->postJson("/api/loans/{$loan->id}/past-due/process", [
            'installments' => [
                ['id' => $installment->id, 'late_fee' => 300],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('data.late_fees_assessed', 1)
        ->assertJsonPath('data.past_due_marked', 1);

    expect($installment->refresh()->status)->toBe('past_due');
    expect((float) $installment->charges()->where('charge_type', 'LATE_FEE')->first()->original_amount)->toBe(300.0);
});

test('collector cannot process past-due for a loan', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $installment = $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => now()->subDays(3)->toDateString(),
        'amount' => 5000,
        'status' => 'pending',
    ]);

    $collector = featureUser(UserRole::Collector->value);

    $this->withHeaders(featureBearer($collector))
        ->postJson("/api/loans/{$loan->id}/past-due/process", [
            'installments' => [
                ['id' => $installment->id, 'late_fee' => 300],
            ],
        ])
        ->assertForbidden();
});

test('approver can edit an installment late fee amount', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $installment = $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => now()->subDays(3)->toDateString(),
        'amount' => 5000,
        'status' => 'past_due',
    ]);

    $charge = LoanCharge::create([
        'loan_id' => $loan->id,
        'loan_installment_id' => $installment->id,
        'client_id' => $client->id,
        'charge_type' => 'LATE_FEE',
        'original_amount' => 500,
        'paid_amount' => 0,
        'waived_amount' => 0,
        'balance' => 500,
        'assessment_date' => now()->toDateString(),
        'status' => 'ASSESSED',
        'reference' => 'LF-FEATURE-3',
    ]);

    $approver = featureUser(UserRole::Approver->value);

    $this->withHeaders(featureBearer($approver))
        ->postJson("/api/loans/{$loan->id}/installments/{$installment->id}/late-fee", [
            'amount' => 750,
        ])
        ->assertOk()
        ->assertJsonPath('data.original_amount', '750.00')
        ->assertJsonPath('data.balance', '750.00');

    expect($charge->refresh()->status)->toBe('ASSESSED');
});

test('collector cannot edit an installment late fee amount', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $installment = $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => now()->subDays(3)->toDateString(),
        'amount' => 5000,
        'status' => 'past_due',
    ]);

    $collector = featureUser(UserRole::Collector->value);

    $this->withHeaders(featureBearer($collector))
        ->postJson("/api/loans/{$loan->id}/installments/{$installment->id}/late-fee", [
            'amount' => 750,
        ])
        ->assertForbidden();
});

test('late fee is editable only while unpaid', function () {
    $client = Client::create(['name' => 'Borrower']);
    $loan = featureLoan($client);

    $installment = $loan->installments()->create([
        'installment_number' => 1,
        'due_date' => now()->subDays(3)->toDateString(),
        'amount' => 5000,
        'status' => 'past_due',
    ]);

    $charge = LoanCharge::create([
        'loan_id' => $loan->id,
        'loan_installment_id' => $installment->id,
        'client_id' => $client->id,
        'charge_type' => 'LATE_FEE',
        'original_amount' => 500,
        'paid_amount' => 0,
        'waived_amount' => 0,
        'balance' => 500,
        'assessment_date' => now()->toDateString(),
        'status' => 'ASSESSED',
        'reference' => 'LF-EDIT-1',
    ]);

    $admin = featureUser(UserRole::Administrator->value);

    $this->withHeaders(featureBearer($admin))
        ->getJson('/api/loans/past-due')
        ->assertOk()
        ->assertJsonPath('data.data.0.overdue_installments.0.late_fee_editable', true);

    $charge->update(['paid_amount' => 200, 'balance' => 300, 'status' => 'PARTIALLY_PAID']);

    $this->withHeaders(featureBearer($admin))
        ->getJson('/api/loans/past-due')
        ->assertOk()
        ->assertJsonPath('data.data.0.overdue_installments.0.late_fee_editable', false);
});
