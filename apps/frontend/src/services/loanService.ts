import api from './api';
import type {
  ApiEnvelope,
  Loan,
  LoanCalculation,
  LoanCharge,
  PaginatedResponse,
  PastDueLoan,
} from '@/types';

export interface LoanFilters {
  application_status?: string;
  loan_status?: string;
  client_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
  reloan?: boolean;
}

export async function getLoans(filters?: LoanFilters): Promise<PaginatedResponse<Loan>> {
  const res = await api.get<ApiEnvelope<PaginatedResponse<Loan>>>('/loans', { params: filters });
  return res.data.data;
}

export async function getLoan(id: number): Promise<Loan> {
  const res = await api.get<ApiEnvelope<Loan>>(`/loans/${id}`);
  return res.data.data;
}

export async function calculateLoan(params: {
  amount: number;
  term_months: number;
  interest_rate_per_month?: number;
  client_id?: number;
  parent_loan_id?: number;
  first_payment_due_date?: string;
  calculation_type?: 'gross_amount' | 'monthly_installment' | 'net_proceeds';
}): Promise<LoanCalculation> {
  const res = await api.post<ApiEnvelope<LoanCalculation>>('/loans/calculate', params);
  return res.data.data;
}

export async function createLoan(data: {
  client_id: number;
  amount: number;
  term_months: number;
  interest_rate_per_month?: number;
  charges?: number;
  charges_description?: string | null;
  parent_loan_id?: number;
  loan_type?: string;
  old_balance_settlement?: number;
  guarantor?: string | null;
  first_payment_due_date?: string;
  application_status?: string;
}): Promise<Loan> {
  const res = await api.post<ApiEnvelope<Loan>>('/loans', data);
  return res.data.data;
}

export async function updateLoan(
  id: number,
  data: {
    amount: number;
    term_months: number;
    interest_rate_per_month: number;
    charges?: number;
    charges_description?: string | null;
    old_balance_settlement?: number;
    guarantor?: string | null;
    first_payment_due_date?: string;
  },
): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}`, data);
  return res.data.data;
}

export async function submitLoan(id: number): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}/submit`);
  return res.data.data;
}

export async function approveLoan(
  id: number,
  data?: { amount?: number; interest_rate_per_month?: number; term_months?: number },
): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}/approve`, data ?? {});
  return res.data.data;
}

export async function rejectLoan(id: number): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}/reject`);
  return res.data.data;
}

export async function releaseLoan(
  id: number,
  data: FormData,
): Promise<Loan> {
  const res = await api.post<ApiEnvelope<Loan>>(`/loans/${id}/release`, data);
  return res.data.data;
}

export async function cancelLoan(id: number): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}/cancel`);
  return res.data.data;
}

export async function voidLoan(id: number): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}/void`);
  return res.data.data;
}

export async function updateReviewStatus(
  id: number,
  application_status: string,
): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}/review-status`, { application_status });
  return res.data.data;
}

export async function updateCollectionStatus(
  id: number,
  collection_status: string,
): Promise<Loan> {
  const res = await api.put<ApiEnvelope<Loan>>(`/loans/${id}/collection-status`, {
    collection_status,
  });
  return res.data.data;
}

export async function getPastDueLoans(params?: {
  per_page?: number;
  page?: number;
}): Promise<PaginatedResponse<PastDueLoan>> {
  const res = await api.get<ApiEnvelope<PaginatedResponse<PastDueLoan>>>('/loans/past-due', {
    params,
  });
  return res.data.data;
}

export async function updateReleaseSource(
  loanId: number,
  sourceId: number,
  data: FormData,
): Promise<Loan> {
  const res = await api.post<ApiEnvelope<Loan>>(
    `/loans/${loanId}/release-sources/${sourceId}`,
    data,
  );
  return res.data.data;
}

export async function undoPastDue(loanId: number): Promise<{
  late_fees_reversed: number;
  installments_reverted: number;
  loans_reverted: number;
}> {
  const res = await api.post<
    ApiEnvelope<{
      late_fees_reversed: number;
      installments_reverted: number;
      loans_reverted: number;
    }>
  >(`/loans/${loanId}/past-due/undo`);
  return res.data.data;
}

export async function processPastDueLoan(
  loanId: number,
  installments: { id: number; late_fee: number }[],
): Promise<{
  overdue_schedules: number;
  past_due_marked: number;
  late_fees_assessed: number;
  loans_updated: number;
}> {
  const res = await api.post<
    ApiEnvelope<{
      overdue_schedules: number;
      past_due_marked: number;
      late_fees_assessed: number;
      loans_updated: number;
    }>
  >(`/loans/${loanId}/past-due/process`, { installments });
  return res.data.data;
}

export async function updateInstallmentLateFee(
  loanId: number,
  installmentId: number,
  amount: number,
): Promise<LoanCharge> {
  const res = await api.post<ApiEnvelope<LoanCharge>>(
    `/loans/${loanId}/installments/${installmentId}/late-fee`,
    { amount },
  );
  return res.data.data;
}

export async function getOutstanding(loanId: number): Promise<{
  loan_id: number;
  loan_number: string | null;
  amount: number;
  remaining_balance: number;
  past_due_amount: number;
  late_fees: number;
  other_charges: number;
  total_outstanding: number;
}> {
  const res = await api.get<ApiEnvelope<{
    loan_id: number;
    loan_number: string | null;
    amount: number;
    remaining_balance: number;
    past_due_amount: number;
    late_fees: number;
    other_charges: number;
    total_outstanding: number;
  }>>(`/loans/${loanId}/outstanding`);
  return res.data.data;
}
