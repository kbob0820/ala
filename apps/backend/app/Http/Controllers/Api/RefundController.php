<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\Refund;
use App\Repositories\Contracts\RefundRepositoryInterface;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefundController extends Controller
{
    public function __construct(
        private readonly RefundService $refundService,
        private readonly RefundRepositoryInterface $refundRepository,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $refunds = $this->refundRepository->paginate(
            $request->integer('per_page', 15),
            [
                'status' => $request->input('status'),
                'loan_id' => $request->integer('loan_id') ?: null,
                'client_id' => $request->integer('client_id') ?: null,
            ],
        );

        return response()->paginated($refunds);
    }

    public function overpayment(Loan $loan): JsonResponse
    {
        $overpayment = $this->refundService->detectOverpayment($loan);

        return response()->success([
            'loan_id' => $loan->id,
            'total_paid' => $loan->totalPaid(),
            'amount' => (float) $loan->amount,
            'unpaid_charges' => $loan->totalUnpaidCharges(),
            'refundable_overpayment' => $overpayment,
        ]);
    }

    public function store(Request $request, Loan $loan): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $refund = $this->refundService->request($loan, $data, (int) $request->user()->id);

        return response()->success($refund, 201, 'Refund requested');
    }

    public function show(Refund $refund): JsonResponse
    {
        $refund->load(['loan', 'client', 'verifiedBy', 'approvedBy', 'releasedBy']);

        return response()->success($refund);
    }

    public function verify(Request $request, Refund $refund): JsonResponse
    {
        $refund = $this->refundService->verify($refund, (int) $request->user()->id);

        return response()->success($refund, 200, 'Refund verified');
    }

    public function approve(Request $request, Refund $refund): JsonResponse
    {
        $refund = $this->refundService->approve($refund, (int) $request->user()->id);

        return response()->success($refund, 200, 'Refund approved');
    }

    public function release(Request $request, Refund $refund): JsonResponse
    {
        $data = $request->validate([
            'release_method' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $refund = $this->refundService->release($refund, $data, (int) $request->user()->id);

        return response()->success($refund, 200, 'Refund released');
    }

    public function complete(Request $request, Refund $refund): JsonResponse
    {
        $refund = $this->refundService->complete($refund, (int) $request->user()->id);

        return response()->success($refund, 200, 'Refund completed');
    }

    public function reject(Request $request, Refund $refund): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        $refund = $this->refundService->reject($refund, $data, (int) $request->user()->id);

        return response()->success($refund, 200, 'Refund rejected');
    }
}
