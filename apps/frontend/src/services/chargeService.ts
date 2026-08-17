import api from './api';
import type { ApiEnvelope, LoanCharge, ChargeType } from '@/types';

export async function getCharges(loanId: number): Promise<LoanCharge[]> {
  const res = await api.get<ApiEnvelope<LoanCharge[]>>(`/loans/${loanId}/charges`);
  return res.data.data;
}

export async function assessCharge(
  loanId: number,
  data: {
    charge_type: Exclude<ChargeType, 'LATE_FEE'>;
    amount: number;
    description?: string;
    reason?: string;
    loan_installment_id?: number;
  },
): Promise<LoanCharge> {
  const res = await api.post<ApiEnvelope<LoanCharge>>(`/loans/${loanId}/charges`, data);
  return res.data.data;
}

export async function requestWaiver(
  chargeId: number,
  waiveAmount: number,
  reason: string,
): Promise<LoanCharge> {
  const res = await api.post<ApiEnvelope<LoanCharge>>(`/charges/${chargeId}/waiver`, {
    waive_amount: waiveAmount,
    reason,
  });
  return res.data.data;
}

export async function approveWaiver(
  chargeId: number,
  waiveAmount: number,
): Promise<LoanCharge> {
  const res = await api.post<ApiEnvelope<LoanCharge>>(`/charges/${chargeId}/waiver/approve`, {
    waive_amount: waiveAmount,
  });
  return res.data.data;
}

export async function rejectWaiver(chargeId: number): Promise<LoanCharge> {
  const res = await api.post<ApiEnvelope<LoanCharge>>(`/charges/${chargeId}/waiver/reject`);
  return res.data.data;
}

export async function reverseCharge(chargeId: number, reason: string): Promise<LoanCharge> {
  const res = await api.post<ApiEnvelope<LoanCharge>>(`/charges/${chargeId}/reverse`, { reason });
  return res.data.data;
}
