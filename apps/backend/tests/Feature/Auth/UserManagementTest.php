<?php

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\User;

beforeEach(function () {
    Role::insert(UserRole::seedData());
});

test('admin can list users', function () {
    $admin = User::factory()->create([
        'role_id' => Role::where('slug', UserRole::Administrator->value)->first()->id,
        'is_active' => true,
    ]);

    User::factory()->count(3)->create();

    $token = $admin->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/users');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonCount(4, 'data.data');
});

test('non-admin cannot list users', function () {
    $loanOfficer = User::factory()->create([
        'role_id' => Role::where('slug', UserRole::LoanOfficer->value)->first()->id,
        'is_active' => true,
    ]);

    $token = $loanOfficer->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/users');

    $response->assertStatus(403)
        ->assertJsonPath('success', false)
        ->assertJsonPath('error.code', 'FORBIDDEN');
});

test('admin can create a user', function () {
    $admin = User::factory()->create([
        'role_id' => Role::where('slug', UserRole::Administrator->value)->first()->id,
        'is_active' => true,
    ]);

    $token = $admin->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/users', [
            'name' => 'New Officer',
            'email' => 'newofficer@example.com',
            'password' => 'password123',
            'role_id' => Role::where('slug', UserRole::LoanOfficer->value)->first()->id,
            'is_active' => true,
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'New Officer')
        ->assertJsonPath('data.role.slug', UserRole::LoanOfficer->value);
});

test('admin can update a user', function () {
    $admin = User::factory()->create([
        'role_id' => Role::where('slug', UserRole::Administrator->value)->first()->id,
        'is_active' => true,
    ]);

    $user = User::factory()->create();

    $token = $admin->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->putJson('/api/users/'.$user->id, [
            'name' => 'Updated Name',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'Updated Name');
});

test('admin can deactivate a user', function () {
    $admin = User::factory()->create([
        'role_id' => Role::where('slug', UserRole::Administrator->value)->first()->id,
        'is_active' => true,
    ]);

    $user = User::factory()->create(['is_active' => true]);

    $token = $admin->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->putJson('/api/users/'.$user->id, [
            'is_active' => false,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.is_active', false);
});

test('admin can delete a user', function () {
    $admin = User::factory()->create([
        'role_id' => Role::where('slug', UserRole::Administrator->value)->first()->id,
        'is_active' => true,
    ]);

    $user = User::factory()->create();

    $token = $admin->createToken('auth-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->deleteJson('/api/users/'.$user->id);

    $response->assertStatus(200)
        ->assertJsonPath('success', true);

    expect(User::find($user->id))->toBeNull();
});

test('unauthenticated user gets 401', function () {
    $response = $this->getJson('/api/users');

    $response->assertStatus(401)
        ->assertJsonPath('success', false)
        ->assertJsonPath('error.code', 'UNAUTHENTICATED');
});
