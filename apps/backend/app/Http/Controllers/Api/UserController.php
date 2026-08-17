<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [];
        if ($request->filled('search')) {
            $filters['search'] = (string) $request->string('search');
        }
        if ($request->has('is_active')) {
            $filters['is_active'] = $request->boolean('is_active');
        }

        $users = $this->userRepository->paginate($request->integer('per_page', 15), $filters);

        return response()->paginated($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (! isset($data['is_active'])) {
            $data['is_active'] = true;
        }

        $user = $this->userRepository->create($data);
        $user->load('role');

        $this->auditService->log('created', 'App\\Models\\User', $user->id, null, [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->slug,
        ]);

        return response()->success($user, 201, 'User created successfully');
    }

    public function show(User $user): JsonResponse
    {
        $user->load('role');

        return response()->success($user);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $oldState = [
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'role_id' => $user->role_id,
        ];

        $data = $request->validated();
        if (isset($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        }

        $user = $this->userRepository->update($user, $data);
        $user->load('role');

        $this->auditService->log('updated', 'App\\Models\\User', $user->id, $oldState, [
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'role_id' => $user->role_id,
        ]);

        return response()->success($user, 200, 'User updated successfully');
    }

    public function destroy(User $user): JsonResponse
    {
        $oldState = [
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
        ];

        $this->userRepository->delete($user);

        $this->auditService->log('deleted', 'App\\Models\\User', $user->id, $oldState, null);

        return response()->success(null, 200, 'User deleted successfully');
    }
}
