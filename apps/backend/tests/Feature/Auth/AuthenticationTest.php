<?php

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\User;

beforeEach(function () {
    Role::insert(UserRole::seedData());
    $this->adminRole = Role::where('slug', UserRole::Administrator->value)->first();
});

test('user can register successfully', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.name', 'Test User')
        ->assertJsonPath('data.user.email', 'test@example.com')
        ->assertJsonStructure(['success', 'data' => ['user', 'token'], 'message']);

    expect(User::where('email', 'test@example.com')->exists())->toBeTrue();
});

test('user can register with a role', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Loan Officer',
        'email' => 'officer@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role_id' => Role::where('slug', UserRole::LoanOfficer->value)->first()->id,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.user.role.slug', UserRole::LoanOfficer->value);
});

test('registration fails with duplicate email', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $response = $this->postJson('/api/register', [
        'name' => 'Another User',
        'email' => 'taken@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonPath('error.code', 'VALIDATION_ERROR');
});

test('registration fails with short password', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => '123',
        'password_confirmation' => '123',
    ]);

    $response->assertStatus(422);
});

test('user can login with valid credentials', function () {
    $user = User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'password123',
        'is_active' => true,
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'login@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.email', 'login@example.com')
        ->assertJsonStructure(['success', 'data' => ['user', 'token']]);
});

test('user cannot login with invalid credentials', function () {
    User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'password123',
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'login@example.com',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(401)
        ->assertJsonPath('success', false)
        ->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
});

test('user cannot login with deactivated account', function () {
    User::factory()->create([
        'email' => 'deactivated@example.com',
        'password' => 'password123',
        'is_active' => false,
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'deactivated@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(401);
});

test('authenticated user can logout', function () {
    $user = User::factory()->create(['is_active' => true]);
    $token = $user->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/logout');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Logged out successfully');
});

test('authenticated user can get their profile', function () {
    $user = User::factory()->create(['is_active' => true]);
    $token = $user->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/user');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.email', $user->email);
});
