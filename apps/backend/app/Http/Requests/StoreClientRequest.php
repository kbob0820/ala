<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'work' => ['nullable', 'string', 'max:255'],
            'work_address' => ['nullable', 'string'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'social_media' => ['nullable', 'array'],
            'social_media.facebook' => ['nullable', 'string', 'max:255'],
            'social_media.twitter' => ['nullable', 'string', 'max:255'],
            'social_media.instagram' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg', 'max:2048'],
        ];
    }
}
