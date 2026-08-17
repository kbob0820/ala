import api from './api';
import { getLoan } from './loanService';
import type { ApiEnvelope, Refund, RefundStatus, OverpaymentInfo, PaginatedResponse } from '@/types';

export async function detectOverpayment(loanId: number): Promise<OverpaymentInfo | null> {
  try {
    const loan = await getLoan(loanId);

    const res = await api.get<ApiEnvelope<{
      loan_id: number;
      total_paid: number;
      amount: number;
      unpaid_charges: number;
      refundable_overpayment: number;
    }>>(`/loans/${loanId}/overpayment`);

    const overpayment = Number(res.data.data.refundable_overpayment);

    if (overpayment <= 0) {
      return null;
    }

    return {
      loanId: loan.id,
      loanNumber: loan.loan_number ?? null,
      clientId: loan.client_id,
      clientName: loan.client?.name ?? '',
      loanAmount: Number(loan.amount),
      totalPaid: Number(res.data.data.total_paid),
      lateFees: 0,
      overpayment,
      loanStatus: loan.loan_status ?? '',
    };
  } catch {
    return null;
  }
}

export async function detectAllOverpayments(): Promise<OverpaymentInfo[]> {
  try {
    const res = await api.get<ApiEnvelope<PaginatedResponse<{ id: number }>>>('/loans', {
      params: { loan_status: 'fully_paid,active,past_due', per_page: 100 },
    });

    const results = await Promise.all(
      res.data.data.data.map((loan) => detectOverpayment(loan.id)),
    );

    return results.filter((r): r is OverpaymentInfo => r !== null);
  } catch {
    return [];
  }
}

export async function getRefunds(params?: {
  status?: RefundStatus;
  per_page?: number;
  page?: number;
}): Promise<PaginatedResponse<Refund>> {
  const res = await api.get<ApiEnvelope<PaginatedResponse<Refund>>>('/refunds', { params });
  return res.data.data;
}

export async function createRefund(data: {
  loan_id: number;
  amount: number;
  reason: string;
  notes?: string;
}): Promise<Refund> {
  const res = await api.post<ApiEnvelope<Refund>>(`/loans/${data.loan_id}/refunds`, {
    amount: data.amount,
    reason: data.reason,
    notes: data.notes,
  });
  return res.data.data;
}

export async function getRefund(id: number): Promise<Refund> {
  const res = await api.get<ApiEnvelope<Refund>>(`/refunds/${id}`);
  return res.data.data;
}

export async function verifyRefund(id: number): Promise<Refund> {
  const res = await api.post<ApiEnvelope<Refund>>(`/refunds/${id}/verify`);
  return res.data.data;
}

export async function approveRefund(id: number): Promise<Refund> {
  const res = await api.post<ApiEnvelope<Refund>>(`/refunds/${id}/approve`);
  return res.data.data;
}

export async function releaseRefund(
  id: number,
  data: { release_method: string; notes?: string },
): Promise<Refund> {
  const res = await api.post<ApiEnvelope<Refund>>(`/refunds/${id}/release`, data);
  return res.data.data;
}

export async function rejectRefund(id: number, notes?: string): Promise<Refund> {
  const res = await api.post<ApiEnvelope<Refund>>(`/refunds/${id}/reject`, { notes });
  return res.data.data;
}
