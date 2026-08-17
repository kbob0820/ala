<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Client::query()->with('loans');

        if ($request->filled('search')) {
            $search = $request->string('search')->value();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%")
                    ->orWhere('work', 'like', "%{$search}%");
            });
        }

        $status = $request->string('status')->value();

        if ($status === 'inactive') {
            $query->onlyTrashed();
        } elseif ($status !== 'all') {
            // default: active — exclude soft-deleted
        }

        $clients = $query->orderBy('name')->paginate($request->integer('per_page', 15));

        return response()->paginated($clients);
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('clients', 'public');
        }

        $client = Client::create($data);

        return response()->success($client, 201, 'Client created successfully');
    }

    public function show(Client $client): JsonResponse
    {
        $client->load(['documents', 'loans' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->success($client);
    }

    public function update(UpdateClientRequest $request, Client $client): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('photo')) {
            if ($client->photo) {
                Storage::disk('public')->delete($client->photo);
            }
            $data['photo'] = $request->file('photo')->store('clients', 'public');
        }

        $client->update($data);

        return response()->success($client, 200, 'Client updated successfully');
    }

    public function destroy(Client $client): JsonResponse
    {
        if ($client->loans()->exists()) {
            return response()->error(
                'Cannot delete this client because they have existing loans.',
                'HAS_LOANS',
                422
            );
        }

        if ($client->photo) {
            Storage::disk('public')->delete($client->photo);
        }

        $client->delete();

        return response()->success(null, 200, 'Client deactivated successfully');
    }

    public function restore(int $id): JsonResponse
    {
        $client = Client::onlyTrashed()->findOrFail($id);

        $client->restore();

        return response()->success($client, 200, 'Client restored successfully');
    }

    public function forceDelete(int $id): JsonResponse
    {
        $client = Client::withTrashed()->findOrFail($id);

        if ($client->loans()->withTrashed()->exists()) {
            return response()->error(
                'Cannot permanently delete this client because they have existing loans.',
                'HAS_LOANS',
                422
            );
        }

        if ($client->photo) {
            Storage::disk('public')->delete($client->photo);
        }

        $client->forceDelete();

        return response()->success(null, 200, 'Client permanently deleted');
    }
}
