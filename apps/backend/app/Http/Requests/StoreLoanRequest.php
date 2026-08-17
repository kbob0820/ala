<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLoanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'client_id' => ['required', 'exists:clients,id'],
            'amount' => ['required', 'numeric', 'min:1'],
            'term_months' => ['required', 'numeric', 'min:0.5', 'max:5'],
            'interest_rate_per_month' => ['nullable', 'numeric', 'min:0'],
            'charges' => ['nullable', 'numeric', 'min:0'],
            'charges_description' => ['nullable', 'string', 'max:255'],
            'parent_loan_id' => ['nullable', 'integer', 'exists:loans,id'],
            'loan_type' => ['sometimes', 'string', 'in:regular,reloan'],
            'old_balance_settlement' => ['nullable', 'numeric', 'min:0'],
            'guarantor' => ['nullable', 'string', 'max:255'],
            'first_payment_due_date' => ['nullable', 'date'],
            'application_status' => ['sometimes', 'string', 'in:draft,submitted'],
        ];
    }
}
