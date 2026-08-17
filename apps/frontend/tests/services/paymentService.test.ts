import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../src/services/loanService', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/loanService')>(
    '../../src/services/loanService',
  );
  return {
    ...actual,
    getLoan: vi.fn(),
  };
});

import * as paymentService from '../../src/services/paymentService';
import api from '../../src/services/api';
import { getLoan } from '../../src/services/loanService';
import type { Payment, Loan } from '../../src/types';

function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    loan_id: 1,
    client_id: 1,
    amount: 3000,
    payment_method: 'Cash',
    payment_date: '2026-08-01',
    notes: null,
    proof_image: null,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

function createLoan(): Loan {
  return {
    id: 1,
    client_id: 1,
    parent_loan_id: null,
    loan_type: 'regular',
    loan_number: null,
    created_by: 1,
    approved_by: null,
    term_months: 3,
    interest_rate_per_month: 10,
    charges: 500,
    charges_description: null,
    old_balance_settlement: 0,
    total_deductions: 0,
    first_payment_due_date: '2026-08-15',
    application_status: 'approved',
    loan_status: 'active',
    collection_status: null,
    amount: 10000,
    total_interest: 3000,
    net_proceeds: 7000,
    installment_amount: 1666.67,
    total_installments: 6,
    approved_at: '2026-08-01T10:00:00Z',
    released_at: '2026-08-02T10:00:00Z',
    closed_at: null,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    deleted_at: null,
  };
}

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLoanPayments', () => {
    it('calls GET /loans/:id/payments', async () => {
      const mockPayments = [createPayment()];
      const mockResponse = { data: { data: mockPayments } };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await paymentService.getLoanPayments(1);

      expect(api.get).toHaveBeenCalledWith('/loans/1/payments');
      expect(result).toEqual(mockPayments);
    });
  });

  describe('recordPayment', () => {
    it('sends POST with FormData and multipart headers', async () => {
      const mockPayment = createPayment();
      const mockResponse = { data: { data: mockPayment } };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('amount', '3000');
      formData.append('payment_method', 'Cash');
      formData.append('payment_date', '2026-08-01');

      const result = await paymentService.recordPayment(1, formData);

      expect(api.post).toHaveBeenCalledWith('/loans/1/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentSummary', () => {
    it('fetches loan and payments, computes totals', async () => {
      const loan = createLoan();
      const payments = [createPayment({ amount: 3000 }), createPayment({ id: 2, amount: 2000, payment_date: '2026-08-15' })];

      (getLoan as ReturnType<typeof vi.fn>).mockResolvedValue(loan);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: payments } });

      const summary = await paymentService.getPaymentSummary(1);

      expect(getLoan).toHaveBeenCalledWith(1);
      expect(api.get).toHaveBeenCalledWith('/loans/1/payments');
      expect(summary.loan).toEqual(loan);
      expect(summary.payments).toEqual(payments);
    });

    it('returns totalPaid as sum of payment amounts', async () => {
      const loan = createLoan();
      const payments = [createPayment({ amount: 3000 }), createPayment({ id: 2, amount: 2000, payment_date: '2026-08-15' })];

      (getLoan as ReturnType<typeof vi.fn>).mockResolvedValue(loan);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: payments } });

      const summary = await paymentService.getPaymentSummary(1);

      expect(summary.totalPaid).toBe(5000);
    });

    it('returns remainingBalance = loan amount - totalPaid', async () => {
      const loan = createLoan();
      const payments = [createPayment({ amount: 3000 }), createPayment({ id: 2, amount: 2000, payment_date: '2026-08-15' })];

      (getLoan as ReturnType<typeof vi.fn>).mockResolvedValue(loan);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: payments } });

      const summary = await paymentService.getPaymentSummary(1);

      expect(summary.remainingBalance).toBe(5000);
    });
  });

  describe('computePaymentLedger', () => {
    it('returns sorted entries with running balance', () => {
      const payments = [
        createPayment({ id: 2, amount: 2000, payment_date: '2026-08-15' }),
        createPayment({ id: 1, amount: 3000, payment_date: '2026-08-01' }),
      ];

      const ledger = paymentService.computePaymentLedger(payments, 10000);

      expect(ledger).toHaveLength(2);
      expect(ledger[0].payment.id).toBe(1);
      expect(ledger[1].payment.id).toBe(2);
      expect(ledger[0].runningBalance).toBe(7000);
      expect(ledger[1].runningBalance).toBe(5000);
    });

    it('starts running balance at loan amount', () => {
      const payments = [createPayment({ amount: 3000 })];
      const ledger = paymentService.computePaymentLedger(payments, 10000);

      expect(ledger[0].runningBalance).toBe(7000);
    });
  });

  describe('verifyProofUpload', () => {
    it('separates verified and unverified non-cash payments', () => {
      const payments = [
        createPayment({ id: 1, amount: 3000, payment_method: 'GCash', proof_image: 'proof1.jpg' }),
        createPayment({ id: 2, amount: 2000, payment_method: 'Bank Transfer', proof_image: null }),
      ];

      const result = paymentService.verifyProofUpload(payments);

      expect(result.verified).toHaveLength(1);
      expect(result.unverified).toHaveLength(1);
      expect(result.missingProof).toHaveLength(1);
    });

    it('ignores cash payments', () => {
      const payments = [
        createPayment({ id: 1, amount: 3000, payment_method: 'Cash', proof_image: null }),
        createPayment({ id: 2, amount: 2000, payment_method: 'GCash', proof_image: 'proof1.jpg' }),
      ];

      const result = paymentService.verifyProofUpload(payments);

      expect(result.verified).toHaveLength(1);
      expect(result.unverified).toHaveLength(0);
    });
  });
});
