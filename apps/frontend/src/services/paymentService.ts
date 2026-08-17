import api from './api';
import type { ApiEnvelope, Payment, PaymentAllocation, Loan } from '@/types';
import { getLoan } from './loanService';

export interface PaymentRecordResult {
  loan: Loan;
  payment: Payment;
  allocations: PaymentAllocation[];
  excess: number;
}

export async function getLoanPayments(loanId: number): Promise<Payment[]> {
  const res = await api.get<ApiEnvelope<Payment[]>>(`/loans/${loanId}/payments`);
  return res.data.data;
}

export async function recordPayment(loanId: number, data: FormData): Promise<PaymentRecordResult> {
  const res = await api.post<ApiEnvelope<PaymentRecordResult>>(`/loans/${loanId}/payments`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function reversePayment(loanId: number, paymentId: number): Promise<{
  loan: Loan;
  payment: Payment;
  reversed_allocations: PaymentAllocation[];
}> {
  const res = await api.post<ApiEnvelope<{
    loan: Loan;
    payment: Payment;
    reversed_allocations: PaymentAllocation[];
  }>>(`/loans/${loanId}/payments/${paymentId}/reverse`);
  return res.data.data;
}

export async function updatePayment(loanId: number, paymentId: number, data: FormData): Promise<Loan> {
  const res = await api.post<ApiEnvelope<Loan>>(`/loans/${loanId}/payments/${paymentId}`, data);
  return res.data.data;
}

export async function deletePayment(loanId: number, paymentId: number): Promise<Loan> {
  const res = await api.delete<ApiEnvelope<Loan>>(`/loans/${loanId}/payments/${paymentId}`);
  return res.data.data;
}

export interface PaymentSummary {
  loan: Loan;
  payments: Payment[];
  totalPaid: number;
  remainingBalance: number;
  lastPaymentDate: string | null;
}

export async function getPaymentSummary(loanId: number): Promise<PaymentSummary> {
  const [loan, payments] = await Promise.all([getLoan(loanId), getLoanPayments(loanId)]);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, loan.amount - totalPaid);
  const lastPaymentDate = payments.length > 0 ? (payments[0]?.payment_date ?? null) : null;

  return {
    loan,
    payments,
    totalPaid,
    remainingBalance,
    lastPaymentDate,
  };
}

export interface PaymentLedgerEntry {
  payment: Payment;
  runningBalance: number;
}

export function computePaymentLedger(payments: Payment[], loanAmount: number): PaymentLedgerEntry[] {
  const sorted = [...payments].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime(),
  );

  let running = loanAmount;
  return sorted.map((payment) => {
    running -= payment.amount;
    return { payment, runningBalance: Math.max(0, running) };
  });
}

export function verifyProofUpload(payments: Payment[]): {
  verified: Payment[];
  unverified: Payment[];
  missingProof: Payment[];
} {
  const nonCash = payments.filter((p) => p.payment_method.toLowerCase() !== 'cash');
  return {
    verified: nonCash.filter((p) => p.proof_image),
    unverified: nonCash.filter((p) => !p.proof_image),
    missingProof: nonCash.filter((p) => !p.proof_image),
  };
}
