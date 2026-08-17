<?php

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\User;
use App\Services\AuthService;

beforeEach(function () {
    Role::insert(UserRole::seedData());
});

test('auth service registers user and returns token', function () {
    $authService = app(AuthService::class);

    $result = $authService->register([
        'name' => 'Unit Test',
        'email' => 'unit@example.com',
        'password' => 'password123',
    ]);

    expect($result)->toHaveKeys(['user', 'token']);
    expect($result['user']->email)->toBe('unit@example.com');
    expect($result['token'])->not->toBeEmpty();
});

test('auth service login returns token for valid credentials', function () {
    User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'password123',
        'is_active' => true,
    ]);

    $authService = app(AuthService::class);

    $result = $authService->login([
        'email' => 'login@example.com',
        'password' => 'password123',
    ]);

    expect($result)->toHaveKeys(['user', 'token']);
    expect($result['user']->email)->toBe('login@example.com');
});

test('auth service login returns null for invalid password', function () {
    User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'password123',
    ]);

    $authService = app(AuthService::class);

    $result = $authService->login([
        'email' => 'login@example.com',
        'password' => 'wrong',
    ]);

    expect($result)->toBeNull();
});

test('auth service login returns null for deactivated user', function () {
    User::factory()->create([
        'email' => 'deactivated@example.com',
        'password' => 'password123',
        'is_active' => false,
    ]);

    $authService = app(AuthService::class);

    $result = $authService->login([
        'email' => 'deactivated@example.com',
        'password' => 'password123',
    ]);

    expect($result)->toBeNull();
});
