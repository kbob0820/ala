<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PaymentType::query();

        if ($request->filled('category')) {
            $query->where('category', $request->string('category')->value());
        }

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        $types = $query->orderBy('name')->paginate($request->integer('per_page', 15));

        return response()->paginated($types);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', 'string', 'in:payment_method,release_method'],
            'is_active' => ['boolean'],
            'fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        $exists = PaymentType::where('name', $validated['name'])
            ->where('category', $validated['category'])
            ->exists();

        if ($exists) {
            return response()->error('This payment type already exists.', 'DUPLICATE', 422);
        }

        $type = PaymentType::create($validated);

        return response()->success($type, 201, 'Payment type created');
    }

    public function update(Request $request, PaymentType $paymentType): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'category' => ['sometimes', 'required', 'string', 'in:payment_method,release_method'],
            'is_active' => ['boolean'],
            'fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        if (isset($validated['name'])) {
            $exists = PaymentType::where('name', $validated['name'])
                ->where('category', $validated['category'] ?? $paymentType->category)
                ->where('id', '!=', $paymentType->id)
                ->exists();

            if ($exists) {
                return response()->error('This payment type already exists.', 'DUPLICATE', 422);
            }
        }

        $paymentType->update($validated);

        return response()->success($paymentType, 200, 'Payment type updated');
    }

    public function destroy(PaymentType $paymentType): JsonResponse
    {
        $paymentType->delete();

        return response()->success(null, 200, 'Payment type deleted');
    }
}
