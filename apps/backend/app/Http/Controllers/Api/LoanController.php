<?php

namespace App\Http\Controllers\Api;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLoanRequest;
use App\Models\Loan;
use App\Models\LoanInstallment;
use App\Models\LoanReleaseSource;
use App\Models\PaymentType;
use App\Services\AuditService;
use App\Services\LoanCalculatorService;
use App\Services\PastDueService;
use App\Services\ReloanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class LoanController extends Controller
{
    public function __construct(
        private readonly LoanCalculatorService $calculator,
        private readonly AuditService $auditService,
        private readonly ReloanService $reloanService,
        private readonly PastDueService $pastDueService,
    ) {}

    public function calculate(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'term_months' => ['required', 'numeric', 'min:0.5', 'max:5'],
            'interest_rate_per_month' => ['nullable', 'numeric', 'min:0'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'parent_loan_id' => ['nullable', 'integer', 'exists:loans,id'],
            'first_payment_due_date' => ['nullable', 'date'],
            'calculation_type' => ['nullable', 'string', 'in:gross_amount,monthly_installment,net_proceeds'],
        ]);

        $result = $this->calculator->calculate(
            (float) $request->input('amount'),
            (float) $request->input('term_months'),
            (float) $request->input('interest_rate_per_month', config('loans.interest_rate_per_month')),
            2,
            $request->integer('client_id') ?: null,
            $request->integer('parent_loan_id') ?: null,
            $request->input('first_payment_due_date'),
            $request->string('calculation_type', 'gross_amount')->value(),
        );

        return response()->success($result);
    }

    public function store(StoreLoanRequest $request): JsonResponse
    {
        $amount = (float) $request->input('amount');
        $termMonths = (float) $request->input('term_months');
        $interestRate = (float) $request->input('interest_rate_per_month', config('loans.interest_rate_per_month'));

        $firstPaymentDueDate = $request->input('first_payment_due_date');
        $calculation = $this->calculator->calculate($amount, $termMonths, $interestRate, 2, null, null, $firstPaymentDueDate);
        $applicationStatus = $request->input('application_status', 'submitted');

        $loanType = $request->input('loan_type', 'regular');
        $parentLoanId = $request->integer('parent_loan_id') ?: null;

        $loanNumber = $this->generateLoanNumber($loanType);

        $loan = Loan::create([
            'client_id' => $request->input('client_id'),
            'parent_loan_id' => $parentLoanId,
            'loan_type' => $loanType,
            'loan_number' => $loanNumber,
            'term_months' => $termMonths,
            'interest_rate_per_month' => $interestRate,
            'charges' => (float) $request->input('charges', 0),
            'charges_description' => $request->input('charges_description'),
            'old_balance_settlement' => (float) $request->input('old_balance_settlement', 0),
            'guarantor' => $request->input('guarantor'),
            'first_payment_due_date' => $firstPaymentDueDate,
            'application_status' => $applicationStatus,
            'amount' => $calculation['amount'],
            'total_interest' => $calculation['total_interest'],
            'net_proceeds' => $calculation['net_proceeds'],
            'installment_amount' => $calculation['installment_amount'],
            'total_installments' => $calculation['total_installments'],
        ]);

        $loan->load(['client']);

        return response()->success($loan, 201, $applicationStatus === 'submitted'
            ? 'Loan application submitted for review'
            : 'Loan application saved as draft');
    }

    private function generateLoanNumber(string $loanType): string
    {
        $typeCode = $loanType === 'reloan' ? 'R' : 'N';
        $prefix = 'LN'.now()->format('ym').'-'.$typeCode;

        $latest = Loan::where('loan_number', 'like', $prefix.'%')
            ->orderBy('loan_number', 'desc')
            ->first();

        if ($latest && $latest->loan_number) {
            $lastSeq = (int) substr($latest->loan_number, -3);
            $nextSeq = $lastSeq + 1;
        } else {
            $nextSeq = 1;
        }

        return $prefix.str_pad((string) $nextSeq, 3, '0', STR_PAD_LEFT);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Loan::with(['client'])
            ->withCount(['installments as unpaid_installments_count' => function ($q) {
                $q->whereIn('status', ['pending', 'due', 'partially_paid', 'past_due']);
            }]);

        if ($request->filled('application_status')) {
            $statuses = explode(',', $request->input('application_status'));
            $query->whereIn('application_status', $statuses);
        }

        if ($request->filled('loan_status')) {
            $statuses = explode(',', $request->input('loan_status'));
            $query->whereIn('loan_status', $statuses);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->integer('client_id'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->value();
            $query->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('reloan')) {
            $query->where('loan_type', 'reloan');
        }

        $loans = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 15));

        return response()->paginated($loans);
    }

    public function show(Loan $loan): JsonResponse
    {
        $loan->load(['client.documents', 'installments.charges', 'payments', 'releaseSources', 'settlementsAsOldLoan.reloanLoan', 'settlementsAsReloan.oldLoan', 'charges']);

        return response()->success($loan);
    }

    public function submit(Loan $loan): JsonResponse
    {
        if ($loan->application_status !== 'draft') {
            return response()->error('Only draft applications can be submitted.', 'INVALID_TRANSITION', 422);
        }

        $loan->update(['application_status' => 'submitted']);

        return response()->success($loan, 200, 'Application submitted for review');
    }

    public function approve(Request $request, Loan $loan): JsonResponse
    {
        if (! in_array($loan->application_status, ['submitted', 'under_review', 'pending_documents'])) {
            return response()->error('Application cannot be approved in its current status.', 'INVALID_TRANSITION', 422);
        }

        if ((float) $loan->old_balance_settlement > 0) {
            $existingActive = Loan::where('client_id', $loan->client_id)
                ->where('id', '!=', $loan->id)
                ->whereIn('loan_status', ['active', 'past_due', 'delinquent'])
                ->exists();

            if (! $existingActive) {
                return response()->error(
                    'Reloan evaluation failed: no active existing loans found for this borrower. The old_balance_settlement field may be stale.',
                    'RELOAN_EVALUATION_FAILED',
                    422
                );
            }
        }

        $termMonths = $loan->term_months ?? 3;
        $interestRate = (float) ($loan->interest_rate_per_month ?? config('loans.interest_rate_per_month'));

        $calculation = $this->calculator->calculate(
            (float) $loan->amount,
            (float) $termMonths,
            $interestRate,
            2,
            null,
            null,
            $loan->first_payment_due_date?->toDateString(),
        );

        foreach ($calculation['schedule'] as $installment) {
            $loan->installments()->create([
                'installment_number' => $installment['installment_number'],
                'due_date' => $installment['due_date'],
                'amount' => $installment['amount'],
                'status' => 'pending',
            ]);
        }

        $loan->update([
            'application_status' => 'approved',
            'loan_status' => 'waiting_for_release',
            'total_interest' => $calculation['total_interest'],
            'net_proceeds' => $calculation['net_proceeds'],
            'installment_amount' => $calculation['installment_amount'],
            'total_installments' => $calculation['total_installments'],
            'approved_at' => now(),
        ]);

        $loan->load(['client', 'installments']);

        return response()->success($loan, 200, 'Loan application approved');
    }

    public function reject(Loan $loan): JsonResponse
    {
        if (! in_array($loan->application_status, ['submitted', 'under_review', 'pending_documents'])) {
            return response()->error('Application cannot be rejected in its current status.', 'INVALID_TRANSITION', 422);
        }

        $loan->update(['application_status' => 'rejected']);

        return response()->success($loan, 200, 'Loan application rejected');
    }

    public function update(Request $request, Loan $loan): JsonResponse
    {
        if ($loan->loan_status !== 'waiting_for_release') {
            return response()->error('Only approved loans awaiting release can be edited.', 'INVALID_TRANSITION', 422);
        }

        $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'term_months' => ['required', 'numeric', 'min:0.5', 'max:5'],
            'interest_rate_per_month' => ['required', 'numeric', 'min:0'],
            'charges' => ['nullable', 'numeric', 'min:0'],
            'charges_description' => ['nullable', 'string', 'max:255'],
            'old_balance_settlement' => ['nullable', 'numeric', 'min:0'],
            'guarantor' => ['nullable', 'string', 'max:255'],
            'first_payment_due_date' => ['nullable', 'date'],
        ]);

        $amount = (float) $request->input('amount');
        $termMonths = (float) $request->input('term_months');
        $interestRate = (float) $request->input('interest_rate_per_month');
        $firstPaymentDueDate = $request->input('first_payment_due_date');

        $calculation = $this->calculator->calculate($amount, $termMonths, $interestRate, 2, null, null, $firstPaymentDueDate);

        $loan->installments()->delete();

        foreach ($calculation['schedule'] as $installment) {
            $loan->installments()->create([
                'installment_number' => $installment['installment_number'],
                'due_date' => $installment['due_date'],
                'amount' => $installment['amount'],
                'status' => 'pending',
            ]);
        }

        $loan->update([
            'amount' => $calculation['amount'],
            'term_months' => $termMonths,
            'interest_rate_per_month' => $interestRate,
            'total_interest' => $calculation['total_interest'],
            'net_proceeds' => $calculation['net_proceeds'],
            'installment_amount' => $calculation['installment_amount'],
            'total_installments' => $calculation['total_installments'],
            'charges' => (float) $request->input('charges', 0),
            'charges_description' => $request->input('charges_description'),
            'old_balance_settlement' => (float) $request->input('old_balance_settlement', 0),
            'guarantor' => $request->input('guarantor'),
            'first_payment_due_date' => $firstPaymentDueDate,
        ]);

        $loan->load(['client', 'installments']);

        return response()->success($loan, 200, 'Loan details updated');
    }

    public function release(Request $request, Loan $loan): JsonResponse
    {
        if ($loan->loan_status !== 'waiting_for_release') {
            return response()->error('Loan is not awaiting release.', 'INVALID_TRANSITION', 422);
        }

        $request->validate([
            'sources' => ['required', 'array', 'min:1'],
            'sources.*.release_method' => ['required', 'string', 'exists:payment_types,name,is_active,1,category,release_method'],
            'sources.*.amount' => ['required', 'numeric', 'min:0.01'],
            'sources.*.proof_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp,bmp', 'max:5120'],
            'sources.*.notes' => ['nullable', 'string'],
            'sources.*.release_date' => ['nullable', 'date'],
            'release_notes' => ['nullable', 'string'],
            'charges' => ['nullable', 'numeric', 'min:0'],
        ]);

        $totalSources = array_sum(array_column($request->input('sources'), 'amount'));

        $totalFees = 0;
        foreach ($request->input('sources') as $source) {
            $paymentType = PaymentType::where('name', $source['release_method'])
                ->where('category', 'release_method')
                ->where('is_active', true)
                ->first();
            if ($paymentType && $paymentType->fee) {
                $totalFees += (float) $paymentType->fee;
            }
        }

        $netToRelease = max(0, (float) $loan->net_proceeds - (float) ($request->input('charges', $loan->charges ?? 0)) - (float) ($loan->old_balance_settlement ?? 0) - $totalFees);

        if (abs((float) $totalSources - $netToRelease) > 0.01) {
            return response()->error(
                'Total of sources must equal Net Proceeds after deductions ('.number_format($netToRelease, 2).')',
                'AMOUNT_MISMATCH',
                422
            );
        }

        foreach ($request->input('sources') as $index => $source) {
            $proofImage = null;
            if ($request->hasFile("sources.{$index}.proof_image")) {
                $proofImage = $request->file("sources.{$index}.proof_image")
                    ->store('releases/'.$loan->id, 'public');
            }

            $paymentType = PaymentType::where('name', $source['release_method'])
                ->where('category', 'release_method')
                ->where('is_active', true)
                ->first();
            $sourceFee = $paymentType?->fee ? (float) $paymentType->fee : 0;

            $loan->releaseSources()->create([
                'release_method' => $source['release_method'],
                'amount' => (float) $source['amount'],
                'fee' => $sourceFee,
                'proof_image' => $proofImage,
                'notes' => $source['notes'] ?? null,
                'release_date' => ! empty($source['release_date']) ? $source['release_date'] : ($request->input('released_at') ?: now()->toDateString()),
            ]);
        }

        $totalDeductions = round((float) $loan->total_interest + (float) ($request->input('charges', $loan->charges ?? 0)), 2);

        $loan->update([
            'loan_status' => 'active',
            'released_at' => $request->input('released_at') ?: now(),
            'charges' => (float) $request->input('charges', $loan->charges ?? 0),
            'total_deductions' => $totalDeductions,
            'net_proceeds' => $netToRelease,
        ]);

        foreach ($loan->installments as $installment) {
            if (now()->startOfDay()->gte($installment->due_date)) {
                $installment->update(['status' => 'due']);
            }
        }

        if ((float) $loan->old_balance_settlement > 0) {
            $this->reloanService->autoCloseOldLoans($loan, $request->user()?->id);
        }

        $loan->refresh()->load(['client', 'installments', 'payments', 'releaseSources']);

        return response()->success($loan, 200, 'Loan released to borrower');
    }

    public function cancel(Loan $loan): JsonResponse
    {
        if (! in_array($loan->application_status, ['draft', 'submitted', 'under_review'])) {
            if ($loan->application_status !== 'approved' || $loan->loan_status !== 'waiting_for_release') {
                return response()->error('Only pending applications can be cancelled.', 'INVALID_TRANSITION', 422);
            }
        }

        $update = ['application_status' => 'cancelled'];
        if ($loan->loan_status === 'waiting_for_release') {
            $update['loan_status'] = null;
            $loan->installments()->delete();
        }

        $loan->update($update);

        return response()->success($loan, 200, 'Loan application cancelled');
    }

    public function void(Loan $loan): JsonResponse
    {
        if ($loan->loan_status !== 'active') {
            return response()->error('Only active loans can be voided.', 'INVALID_TRANSITION', 422);
        }

        if ($loan->payments()->exists()) {
            return response()->error('Cannot void a loan with recorded payments.', 'HAS_PAYMENTS', 422);
        }

        if ($loan->installments()->whereHas('charges')->exists()) {
            return response()->error('Cannot void a loan with late fees.', 'HAS_LATE_FEES', 422);
        }

        $oldState = $loan->only([
            'loan_status', 'released_at', 'net_proceeds', 'charges', 'collection_status',
        ]);

        foreach ($loan->releaseSources as $source) {
            if ($source->proof_image) {
                Storage::disk('public')->delete($source->proof_image);
            }
        }
        $loan->releaseSources()->delete();

        $loan->installments()->where('status', 'due')->update(['status' => 'pending']);

        $loan->update([
            'loan_status' => 'waiting_for_release',
            'released_at' => null,
            'net_proceeds' => (float) $loan->amount - (float) $loan->total_interest,
            'charges' => 0,
            'collection_status' => null,
        ]);

        if ($loan->parent_loan_id) {
            $this->reloanService->restoreLoansFromReloan($loan);
        }

        $loan->refresh()->load(['client', 'installments', 'payments', 'releaseSources']);

        $this->auditService->log(
            'voided',
            'App\\Models\\Loan',
            $loan->id,
            $oldState,
            $loan->only(['loan_status', 'released_at', 'net_proceeds', 'charges', 'collection_status'])
        );

        return response()->success($loan, 200, 'Loan release voided');
    }

    public function updateReviewStatus(Request $request, Loan $loan): JsonResponse
    {
        if (! in_array($loan->application_status, ['submitted', 'under_review', 'pending_documents'])) {
            return response()->error('Application is not in a reviewable status.', 'INVALID_TRANSITION', 422);
        }

        $request->validate([
            'application_status' => ['required', 'string', 'in:under_review,pending_documents,submitted'],
        ]);

        $loan->update(['application_status' => $request->input('application_status')]);

        return response()->success($loan, 200, 'Review status updated');
    }

    public function pastDue(Request $request): JsonResponse
    {
        $query = Loan::with([
            'client',
            'installments' => function ($q) {
                $q->whereIn('status', ['pending', 'due', 'partially_paid', 'past_due'])
                    ->where('due_date', '<', now()->toDateString());
            },
            'installments.charges',
            'charges',
        ]);

        $query->whereIn('loan_status', ['active', 'past_due', 'delinquent', 'defaulted']);
        $query->whereHas('installments', function ($q) {
            $q->whereIn('status', ['pending', 'due', 'partially_paid', 'past_due'])
                ->where('due_date', '<', now()->toDateString());
        });

        $loans = $query->paginate($request->integer('per_page', 15));

        $result = [];
        foreach ($loans->items() as $loan) {
            $installmentData = [];
            $maxDaysOverdue = 0;
            foreach ($loan->installments as $installment) {
                $dueDate = Carbon::parse($installment->due_date);
                $daysOverdue = (int) $dueDate->diffInDays(Carbon::today());
                $maxDaysOverdue = max($maxDaysOverdue, $daysOverdue);
                $installmentData[] = [
                    'id' => $installment->id,
                    'installment_number' => $installment->installment_number,
                    'due_date' => $dueDate->toDateString(),
                    'amount' => (float) $installment->amount,
                    'paid_amount' => (float) $installment->paid_amount,
                    'past_due_amount' => $installment->remainingAmount(),
                    'days_overdue' => $daysOverdue,
                    'late_fees' => $installment->totalLateFees(),
                    'late_fee_editable' => $installment->charges
                        ->contains(fn ($charge) => $charge->charge_type === ChargeType::LateFee->value
                            && $charge->status === ChargeStatus::Assessed->value),
                    'status' => $installment->status,
                ];
            }

            $lateFees = $loan->totalUnpaidCharges(ChargeType::LateFee->value);

            $result[] = [
                'id' => $loan->id,
                'client' => $loan->client,
                'loan_number' => $loan->loan_number,
                'amount' => (float) $loan->amount,
                'loan_status' => $loan->loan_status,
                'collection_status' => $loan->collection_status,
                'overdue_installments' => $installmentData,
                'max_days_overdue' => $maxDaysOverdue,
                'late_fees' => $lateFees,
                'total_outstanding' => $loan->totalOutstandingBalance(),
                'risk_level' => match (true) {
                    $maxDaysOverdue >= 90 => 'CRITICAL',
                    $maxDaysOverdue >= 60 => 'HIGH',
                    $maxDaysOverdue >= 30 => 'MEDIUM',
                    default => 'LOW',
                },
            ];
        }

        $paginator = new LengthAwarePaginator(
            $result,
            $loans->total(),
            $loans->perPage(),
            $loans->currentPage(),
            $loans->getOptions(),
        );

        return response()->paginated($paginator);
    }

    public function outstanding(Loan $loan): JsonResponse
    {
        $lateFees = $loan->totalUnpaidCharges(ChargeType::LateFee->value);

        return response()->success([
            'loan_id' => $loan->id,
            'loan_number' => $loan->loan_number,
            'amount' => (float) $loan->amount,
            'remaining_balance' => (float) $loan->remaining_balance,
            'past_due_amount' => $loan->pastDueAmount(),
            'late_fees' => $lateFees,
            'other_charges' => round($loan->totalUnpaidCharges() - $lateFees, 2),
            'total_outstanding' => $loan->totalOutstandingBalance(),
        ]);
    }

    public function undoPastDue(Request $request, Loan $loan): JsonResponse
    {
        $result = $this->pastDueService->undo($loan, $request->user()?->id);

        return response()->success($result, 200, 'Past-due processing undone');
    }

    public function processPastDueLoan(Request $request, Loan $loan): JsonResponse
    {
        $data = $request->validate([
            'installments' => ['required', 'array', 'min:1'],
            'installments.*.id' => ['required', 'integer'],
            'installments.*.late_fee' => ['required', 'numeric', 'min:0'],
        ]);

        $result = $this->pastDueService->processLoan($loan, $data['installments'], $request->user()?->id);

        return response()->success($result, 200, 'Past-due processed for loan');
    }

    public function updateInstallmentLateFee(Request $request, Loan $loan, LoanInstallment $installment): JsonResponse
    {
        if ($installment->loan_id !== $loan->id) {
            return response()->error('Installment does not belong to this loan.', 'INVALID_INSTALLMENT', 422);
        }

        $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        try {
            $charge = $this->pastDueService->updateLateFee(
                $installment,
                (float) $request->input('amount'),
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return response()->error($e->getMessage(), 'INVALID_EDIT', 422);
        }

        return response()->success($charge, 200, 'Late fee updated');
    }

    public function updateCollectionStatus(Request $request, Loan $loan): JsonResponse
    {
        $request->validate([
            'collection_status' => ['required', 'string', 'in:reminder_sent,promise_to_pay,under_collection,legal_action,settled'],
        ]);

        $loan->update([
            'collection_status' => $request->input('collection_status'),
        ]);

        return response()->success($loan, 200, 'Collection status updated');
    }

    public function updateReleaseSourceProof(Request $request, Loan $loan, LoanReleaseSource $source): JsonResponse
    {
        if ($source->loan_id !== $loan->id) {
            return response()->error('Release source does not belong to this loan.', 'INVALID_SOURCE', 422);
        }

        $request->validate([
            'proof_image' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp,bmp', 'max:5120'],
        ]);

        if ($source->proof_image) {
            Storage::disk('public')->delete($source->proof_image);
        }

        $path = $request->file('proof_image')->store('releases/'.$loan->id, 'public');
        $source->update(['proof_image' => $path]);

        $loan->load(['client', 'installments', 'payments', 'releaseSources']);

        return response()->success($loan, 200, 'Proof updated');
    }

    public function destroyReleaseSourceProof(Loan $loan, LoanReleaseSource $source): JsonResponse
    {
        if ($source->loan_id !== $loan->id) {
            return response()->error('Release source does not belong to this loan.', 'INVALID_SOURCE', 422);
        }

        if ($source->proof_image) {
            Storage::disk('public')->delete($source->proof_image);
        }

        $source->update(['proof_image' => null]);

        $loan->load(['client', 'installments', 'payments', 'releaseSources']);

        return response()->success($loan, 200, 'Proof removed');
    }

    public function updateReleaseSource(Request $request, Loan $loan, LoanReleaseSource $source): JsonResponse
    {
        if ($source->loan_id !== $loan->id) {
            return response()->error('Release source does not belong to this loan.', 'INVALID_SOURCE', 422);
        }

        $user = $request->user();
        if (! $user->hasAnyRole(['administrator', 'approver'])) {
            return response()->error('You are not authorized to edit release entries.', 'FORBIDDEN', 403);
        }

        $request->validate([
            'release_method' => ['sometimes', 'string', 'exists:payment_types,name,is_active,1,category,release_method'],
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string'],
            'release_date' => ['nullable', 'date'],
            'proof_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp,bmp', 'max:5120'],
        ]);

        $oldState = $source->only(['release_method', 'amount', 'notes', 'proof_image', 'release_date']);
        $data = [];

        if ($request->has('release_method')) {
            $data['release_method'] = $request->input('release_method');

            $paymentType = PaymentType::where('name', $request->input('release_method'))
                ->where('category', 'release_method')
                ->where('is_active', true)
                ->first();
            $data['fee'] = $paymentType?->fee ? (float) $paymentType->fee : 0;
        }

        if ($request->has('amount')) {
            $newAmount = (float) $request->input('amount');
            $data['amount'] = $newAmount;

            $methodName = $data['release_method'] ?? $source->release_method;
            $otherSources = $loan->releaseSources()
                ->where('id', '!=', $source->id)
                ->get();

            $otherAmountsTotal = (float) $otherSources->sum('amount');
            $otherFeesTotal = (float) $otherSources->sum('fee');

            $thisSourceFee = $data['fee'] ?? (float) $source->fee;

            $totalSources = $otherAmountsTotal + $newAmount;
            $totalFees = $otherFeesTotal + $thisSourceFee;

            $netToRelease = max(0, (float) $loan->net_proceeds);

            if (abs($totalSources - $netToRelease) > 0.01) {
                return response()->error(
                    'Total of sources must equal Net Proceeds after deductions ('.number_format($netToRelease, 2).')',
                    'AMOUNT_MISMATCH',
                    422
                );
            }
        }

        if ($request->has('notes')) {
            $data['notes'] = $request->input('notes');
        }

        if ($request->has('release_date')) {
            $data['release_date'] = $request->input('release_date');
        }

        if ($request->hasFile('proof_image')) {
            if ($source->proof_image) {
                Storage::disk('public')->delete($source->proof_image);
            }
            $data['proof_image'] = $request->file('proof_image')->store('releases/'.$loan->id, 'public');
        }

        if ($request->input('remove_proof') === '1') {
            if ($source->proof_image) {
                Storage::disk('public')->delete($source->proof_image);
            }
            $data['proof_image'] = null;
        }

        if (empty($data)) {
            return response()->error('No fields to update.', 'NO_CHANGES', 422);
        }

        $source->update($data);

        $totalSources = (float) $loan->releaseSources()->sum('amount');
        $totalFees = (float) $loan->releaseSources()->sum('fee');
        $rawProceeds = (float) $loan->amount - (float) $loan->total_interest;
        $newNetProceeds = max(0, $rawProceeds - (float) ($loan->charges ?? 0) - (float) ($loan->old_balance_settlement ?? 0) - $totalFees);
        $loan->update(['net_proceeds' => $newNetProceeds]);

        $this->auditService->log(
            'updated',
            'App\\Models\\LoanReleaseSource',
            $source->id,
            $oldState,
            $source->only(['release_method', 'amount', 'fee', 'notes', 'proof_image', 'release_date'])
        );

        $loan->load(['client', 'installments', 'payments', 'releaseSources']);

        return response()->success($loan, 200, 'Release source updated');
    }
}
