<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Services\ChargeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChargeController extends Controller
{
    public function __construct(
        private readonly ChargeService $chargeService,
    ) {}

    public function index(Loan $loan): JsonResponse
    {
        $charges = $loan->charges()
            ->with(['installment', 'requestedBy', 'approvedBy', 'reversedBy'])
            ->orderBy('assessment_date')
            ->orderBy('id')
            ->get();

        return response()->success($charges);
    }

    public function store(Request $request, Loan $loan): JsonResponse
    {
        $data = $request->validate([
            'charge_type' => ['required', 'string', 'in:TRANSFER_FEE,OTHER_CHARGE'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:255'],
            'loan_installment_id' => ['nullable', 'integer', 'exists:loan_installments,id'],
            'reason' => ['nullable', 'string'],
            'assessment_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
        ]);

        $charge = $this->chargeService->assessManualCharge($loan, $data, $request->user()?->id);

        return response()->success($charge, 201, 'Charge assessed successfully');
    }

    public function show(LoanCharge $charge): JsonResponse
    {
        $charge->load(['loan', 'installment', 'client', 'requestedBy', 'approvedBy', 'reversedBy', 'allocations']);

        return response()->success($charge);
    }

    public function requestWaiver(Request $request, LoanCharge $charge): JsonResponse
    {
        $data = $request->validate([
            'waive_amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string'],
        ]);

        $charge = $this->chargeService->requestWaiver(
            $charge,
            (float) $data['waive_amount'],
            $data['reason'],
            (int) $request->user()->id,
        );

        return response()->success($charge, 200, 'Waiver requested');
    }

    public function approveWaiver(Request $request, LoanCharge $charge): JsonResponse
    {
        $data = $request->validate([
            'waive_amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $charge = $this->chargeService->approveWaiver(
            $charge,
            (float) $data['waive_amount'],
            (int) $request->user()->id,
        );

        return response()->success($charge, 200, 'Waiver approved');
    }

    public function rejectWaiver(Request $request, LoanCharge $charge): JsonResponse
    {
        $charge = $this->chargeService->rejectWaiver($charge, (int) $request->user()->id);

        return response()->success($charge, 200, 'Waiver request rejected');
    }

    public function reverse(Request $request, LoanCharge $charge): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string'],
        ]);

        $charge = $this->chargeService->reverse($charge, $data['reason'], (int) $request->user()->id);

        return response()->success($charge, 200, 'Charge reversed');
    }

    public function audit(LoanCharge $charge): JsonResponse
    {
        $logs = AuditLog::where('entity_type', LoanCharge::class)
            ->where('entity_id', $charge->id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->paginated($logs);
    }
}
