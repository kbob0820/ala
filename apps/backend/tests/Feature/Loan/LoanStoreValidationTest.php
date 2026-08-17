<?php

use App\Models\Client;
use App\Models\User;

function loanStoreBearer(User $user): array
{
    return ['Authorization' => 'Bearer '.$user->createToken('auth-token')->plainTextToken];
}

test('loan store accepts fractional term months and derives installments', function () {
    $user = User::factory()->create();
    $client = Client::create(['name' => 'Borrower']);

    $this->withHeaders(loanStoreBearer($user))
        ->postJson('/api/loans', [
            'client_id' => $client->id,
            'amount' => 10000,
            'term_months' => 2.5,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.term_months', 2.5)
        ->assertJsonPath('data.total_installments', 5);
});

test('loan store rejects term months above five', function () {
    $user = User::factory()->create();
    $client = Client::create(['name' => 'Borrower']);

    $this->withHeaders(loanStoreBearer($user))
        ->postJson('/api/loans', [
            'client_id' => $client->id,
            'amount' => 10000,
            'term_months' => 6,
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.details.term_months', ['The term months field must not be greater than 5.']);
});

test('loan store rejects term months below half a month', function () {
    $user = User::factory()->create();
    $client = Client::create(['name' => 'Borrower']);

    $this->withHeaders(loanStoreBearer($user))
        ->postJson('/api/loans', [
            'client_id' => $client->id,
            'amount' => 10000,
            'term_months' => 0.25,
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.details.term_months', ['The term months field must be at least 0.5.']);
});

test('new loan number uses LNYYMM-N### format', function () {
    $user = User::factory()->create();
    $client = Client::create(['name' => 'Borrower']);

    $response = $this->withHeaders(loanStoreBearer($user))
        ->postJson('/api/loans', [
            'client_id' => $client->id,
            'amount' => 10000,
            'term_months' => 3,
        ]);

    $response->assertStatus(201);
    $this->assertMatchesRegularExpression('/^LN\d{4}-N\d{3}$/', $response->json('data.loan_number'));
});

test('reloan number uses LNYYMM-R### format', function () {
    $user = User::factory()->create();
    $client = Client::create(['name' => 'Borrower']);

    $response = $this->withHeaders(loanStoreBearer($user))
        ->postJson('/api/loans', [
            'client_id' => $client->id,
            'amount' => 10000,
            'term_months' => 3,
            'loan_type' => 'reloan',
        ]);

    $response->assertStatus(201);
    $this->assertMatchesRegularExpression('/^LN\d{4}-R\d{3}$/', $response->json('data.loan_number'));
});

test('loan number sequence increments within the same month and type', function () {
    $user = User::factory()->create();
    $client = Client::create(['name' => 'Borrower']);
    $headers = loanStoreBearer($user);

    $first = $this->withHeaders($headers)->postJson('/api/loans', [
        'client_id' => $client->id,
        'amount' => 10000,
        'term_months' => 3,
    ])->assertStatus(201)->json('data.loan_number');

    $second = $this->withHeaders($headers)->postJson('/api/loans', [
        'client_id' => $client->id,
        'amount' => 10000,
        'term_months' => 3,
    ])->assertStatus(201)->json('data.loan_number');

    $this->assertSame(1, preg_match('/^LN\d{4}-N(\d{3})$/', $first, $firstMatches));
    $this->assertSame(1, preg_match('/^LN\d{4}-N(\d{3})$/', $second, $secondMatches));
    $this->assertSame((int) $firstMatches[1] + 1, (int) $secondMatches[1]);
});
