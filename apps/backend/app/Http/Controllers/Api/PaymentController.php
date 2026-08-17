<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Models\Loan;
use App\Models\Payment;
use App\Services\PaymentAllocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentAllocationService $allocationService,
    ) {}

    public function index(Loan $loan): JsonResponse
    {
        $payments = $loan->payments()->with('allocations')->orderBy('payment_date', 'desc')->get();

        return response()->success($payments);
    }

    public function store(StorePaymentRequest $request, Loan $loan): JsonResponse
    {
        if ($loan->application_status === 'cancelled' || $loan->loan_status === 'cancelled') {
            return response()->error('Cannot record payment for a cancelled loan.', 'LOAN_CANCELLED', 422);
        }

        $proofImage = null;
        if ($request->hasFile('proof_image')) {
            $proofImage = $request->file('proof_image')->store('payments/'.$loan->id, 'public');
        }

        $payment = Payment::create([
            'loan_id' => $loan->id,
            'client_id' => $loan->client_id,
            'amount' => $request->input('amount'),
            'status' => 'posted',
            'payment_method' => $request->input('payment_method'),
            'payment_date' => $request->input('payment_date'),
            'notes' => $request->input('notes'),
            'proof_image' => $proofImage,
        ]);

        $result = $this->allocationService->allocate($payment);

        $this->syncLoanStatus($loan);

        $loan->load(['client', 'installments', 'payments', 'releaseSources', 'charges']);

        return response()->success([
            'loan' => $loan,
            'payment' => $payment->load('allocations'),
            'allocations' => $result['allocations'],
            'excess' => $result['excess'],
        ], 201, 'Payment recorded and allocated successfully');
    }

    public function update(Request $request, Loan $loan, Payment $payment): JsonResponse
    {
        if ($payment->loan_id !== $loan->id) {
            return response()->error('Payment does not belong to this loan.', 'INVALID_PAYMENT', 422);
        }

        if ($loan->application_status === 'cancelled' || $loan->loan_status === 'cancelled') {
            return response()->error('Cannot update payment for a cancelled loan.', 'LOAN_CANCELLED', 422);
        }

        $request->validate([
            'notes' => ['nullable', 'string'],
            'proof_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp,bmp', 'max:5120'],
        ]);

        $data = [];

        if ($request->has('notes')) {
            $data['notes'] = $request->input('notes');
        }

        if ($request->hasFile('proof_image')) {
            if ($payment->proof_image) {
                Storage::disk('public')->delete($payment->proof_image);
            }
            $data['proof_image'] = $request->file('proof_image')->store('payments/'.$loan->id, 'public');
        }

        if ($request->input('remove_proof') === '1') {
            if ($payment->proof_image) {
                Storage::disk('public')->delete($payment->proof_image);
            }
            $data['proof_image'] = null;
        }

        if (! empty($data)) {
            $payment->update($data);
        }

        $loan->load(['client', 'installments', 'payments', 'releaseSources', 'charges']);

        return response()->success($loan, 200, 'Payment updated');
    }

    /**
     * Reverse a payment without deleting the financial record.
     */
    public function reverse(Loan $loan, Payment $payment): JsonResponse
    {
        if ($payment->loan_id !== $loan->id) {
            return response()->error('Payment does not belong to this loan.', 'INVALID_PAYMENT', 422);
        }

        if ($payment->status === 'reversed') {
            return response()->error('Payment is already reversed.', 'ALREADY_REVERSED', 422);
        }

        $reversed = $this->allocationService->reverse($payment);

        $payment->update(['status' => 'reversed']);

        $this->syncLoanStatus($loan);

        $loan->load(['client', 'installments', 'payments', 'releaseSources', 'charges']);

        return response()->success([
            'loan' => $loan,
            'payment' => $payment->fresh('allocations'),
            'reversed_allocations' => $reversed,
        ], 200, 'Payment reversed');
    }

    public function destroy(Loan $loan, Payment $payment): JsonResponse
    {
        if ($payment->loan_id !== $loan->id) {
            return response()->error('Payment does not belong to this loan.', 'INVALID_PAYMENT', 422);
        }

        if ($payment->status !== 'reversed') {
            $this->allocationService->reverse($payment);
        }

        if ($payment->proof_image) {
            Storage::disk('public')->delete($payment->proof_image);
        }

        $payment->delete();

        $this->syncLoanStatus($loan);

        $loan->load(['client', 'installments', 'payments', 'releaseSources', 'charges']);

        return response()->success($loan, 200, 'Payment deleted');
    }

    private function syncLoanStatus(Loan $loan): void
    {
        if ($loan->totalOutstandingBalance() <= 0) {
            $loan->update([
                'loan_status' => 'fully_paid',
                'closed_at' => now(),
            ]);

            return;
        }

        if ($loan->hasOverdueInstallments()) {
            if ($loan->loan_status !== 'past_due' && $loan->loan_status !== 'delinquent' && $loan->loan_status !== 'defaulted') {
                $loan->update(['loan_status' => 'past_due']);
            }
        } elseif (in_array($loan->loan_status, ['past_due', 'delinquent', 'fully_paid'], true)) {
            $loan->update([
                'loan_status' => 'active',
                'closed_at' => null,
            ]);
        }
    }
}
