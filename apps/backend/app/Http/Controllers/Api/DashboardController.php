<?php

namespace App\Http\Controllers\Api;

use App\Enums\ChargeStatus;
use App\Enums\ChargeType;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Loan;
use App\Models\LoanCharge;
use App\Models\LoanInstallment;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $totalClients = Client::count();
        $activeLoans = Loan::whereIn('loan_status', ['active', 'past_due'])->count();
        $pendingApplications = Loan::whereIn('application_status', ['submitted', 'under_review', 'pending_documents'])->count();
        $completedLoans = Loan::whereIn('loan_status', ['fully_paid', 'settled_by_reloan', 'closed'])->count();
        $defaultedLoans = Loan::where('loan_status', 'defaulted')->count();

        $totalCollections = (float) Payment::where('status', '!=', 'reversed')->sum('amount');

        $dueInstallments = LoanInstallment::whereIn('status', ['pending', 'due'])
            ->where('due_date', '<', now()->toDateString())
            ->count();

        $overdueInstallments = LoanInstallment::whereIn('status', ['pending', 'due', 'partially_paid', 'past_due'])
            ->where('due_date', '<', now()->toDateString())
            ->count();

        $totalExpectedRepayments = (float) LoanInstallment::whereIn('status', ['pending', 'due', 'partially_paid', 'past_due'])->sum('amount');

        $totalLateFees = (float) LoanCharge::where('charge_type', ChargeType::LateFee->value)
            ->whereIn('status', ChargeStatus::unpaidStatuses())
            ->sum('balance');

        return response()->success([
            'summary' => [
                'total_clients' => $totalClients,
                'active_loans' => $activeLoans,
                'pending_applications' => $pendingApplications,
                'completed_loans' => $completedLoans,
                'defaulted_loans' => $defaultedLoans,
                'total_collections' => round($totalCollections, 2),
                'total_expected_repayments' => round($totalExpectedRepayments, 2),
                'due_installments' => $dueInstallments,
                'overdue_installments' => $overdueInstallments,
                'total_late_fees' => round($totalLateFees, 2),
            ],
            'recent_loans' => Loan::with('client')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(),
            'upcoming_due' => LoanInstallment::with('loan.client')
                ->whereIn('status', ['pending', 'due'])
                ->where('due_date', '>=', now()->toDateString())
                ->orderBy('due_date')
                ->limit(10)
                ->get(),
        ]);
    }
}
