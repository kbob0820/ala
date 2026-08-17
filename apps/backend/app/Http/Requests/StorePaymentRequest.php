<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'exists:payment_types,name,is_active,1,category,payment_method'],
            'payment_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'proof_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp,bmp', 'max:5120'],
        ];
    }
}
