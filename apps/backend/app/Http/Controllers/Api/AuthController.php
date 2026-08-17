<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->success($result, 201, 'Registration successful');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login([
            'email' => $request->input('email'),
            'password' => $request->input('password'),
        ]);

        if ($result === null) {
            return response()->error('Invalid credentials', 'INVALID_CREDENTIALS', 401);
        }

        return response()->success($result);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->success(null, 200, 'Logged out successfully');
    }

    public function user(Request $request): JsonResponse
    {
        $user = $this->authService->getCurrentUser($request->user());

        return response()->success($user);
    }
}
