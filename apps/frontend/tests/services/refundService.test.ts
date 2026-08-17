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

import * as refundService from '../../src/services/refundService';
import api from '../../src/services/api';
import { getLoan } from '../../src/services/loanService';
import type { Loan } from '../../src/types';

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    client_id: 10,
    parent_loan_id: null,
    loan_type: 'regular',
    loan_number: null,
    client: { id: 10, name: 'Test Borrower' },
    created_by: 1,
    approved_by: null,
    term_months: 3,
    interest_rate_per_month: 10,
    charges: 500,
    charges_description: null,
    old_balance_settlement: 0,
    total_deductions: 0,
    guarantor: null,
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
    installments: [],
    ...overrides,
  };
}

function overpaymentResponse(refundable: number, totalPaid: number) {
  return {
    data: {
      data: {
        loan_id: 1,
        total_paid: totalPaid,
        amount: 10000,
        unpaid_charges: 0,
        refundable_overpayment: refundable,
      },
    },
  };
}

describe('refundService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectOverpayment', () => {
    it('returns OverpaymentInfo when refundable overpayment is positive', async () => {
      const loan = makeLoan();
      (getLoan as ReturnType<typeof vi.fn>).mockResolvedValue(loan);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(overpaymentResponse(1000, 11000));

      const result = await refundService.detectOverpayment(1);

      expect(result).not.toBeNull();
      expect(api.get).toHaveBeenCalledWith('/loans/1/overpayment');
    });

    it('returns the refundable overpayment amount from the backend', async () => {
      const loan = makeLoan();
      (getLoan as ReturnType<typeof vi.fn>).mockResolvedValue(loan);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(overpaymentResponse(1000, 11000));

      const result = await refundService.detectOverpayment(1);

      expect(result!.overpayment).toBe(1000);
    });

    it('returns null when there is no refundable overpayment', async () => {
      const loan = makeLoan();
      (getLoan as ReturnType<typeof vi.fn>).mockResolvedValue(loan);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(overpaymentResponse(0, 10000));

      const result = await refundService.detectOverpayment(1);

      expect(result).toBeNull();
    });

    it('returns null when the request fails', async () => {
      (getLoan as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const result = await refundService.detectOverpayment(1);

      expect(result).toBeNull();
    });

    it('includes clientName from loan.client.name', async () => {
      const loan = makeLoan();
      (getLoan as ReturnType<typeof vi.fn>).mockResolvedValue(loan);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(overpaymentResponse(500, 10500));

      const result = await refundService.detectOverpayment(1);

      expect(result!.clientName).toBe('Test Borrower');
    });
  });

  describe('detectAllOverpayments', () => {
    it('filters out null results', async () => {
      const loan1 = makeLoan({ id: 1 });
      const loan2 = makeLoan({ id: 2, amount: 30000 });

      (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url === '/loans') {
          return Promise.resolve({
            data: {
              data: {
                data: [{ id: 1 }, { id: 2 }],
                links: { first: null, last: null, prev: null, next: null },
                meta: { current_page: 1, last_page: 1, per_page: 100, total: 2, from: 1, to: 2 },
              },
            },
          });
        }
        if (url === '/loans/1/overpayment') {
          return Promise.resolve(overpaymentResponse(1000, 11000));
        }
        return Promise.resolve(overpaymentResponse(0, 0));
      });

      (getLoan as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(loan1)
        .mockResolvedValueOnce(loan2);

      const result = await refundService.detectAllOverpayments();

      expect(result).toHaveLength(1);
      expect(result[0]!.loanId).toBe(1);
    });
  });

  describe('createRefund', () => {
    it('calls POST /loans/:id/refunds', async () => {
      const refund = { id: 9, loan_id: 1, client_id: 10, amount: 500, reason: 'Overpayment', status: 'requested' };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: refund } });

      const result = await refundService.createRefund({
        loan_id: 1,
        amount: 500,
        reason: 'Overpayment',
      });

      expect(api.post).toHaveBeenCalledWith('/loans/1/refunds', {
        amount: 500,
        reason: 'Overpayment',
        notes: undefined,
      });
      expect(result.status).toBe('requested');
    });
  });

  describe('getRefund', () => {
    it('calls GET /refunds/:id', async () => {
      const refund = { id: 42, status: 'requested' };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: refund } });

      const result = await refundService.getRefund(42);

      expect(api.get).toHaveBeenCalledWith('/refunds/42');
      expect(result.status).toBe('requested');
    });
  });

  describe('refund workflow actions', () => {
    it('verifyRefund calls POST /refunds/:id/verify', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: { id: 1, status: 'verified' } } });

      const result = await refundService.verifyRefund(1);

      expect(api.post).toHaveBeenCalledWith('/refunds/1/verify');
      expect(result.status).toBe('verified');
    });

    it('approveRefund calls POST /refunds/:id/approve', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: { id: 1, status: 'approved' } } });

      const result = await refundService.approveRefund(1);

      expect(api.post).toHaveBeenCalledWith('/refunds/1/approve');
      expect(result.status).toBe('approved');
    });

    it('releaseRefund calls POST /refunds/:id/release', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: { id: 1, status: 'released' } } });

      const result = await refundService.releaseRefund(1, { release_method: 'GCash' });

      expect(api.post).toHaveBeenCalledWith('/refunds/1/release', { release_method: 'GCash', notes: undefined });
      expect(result.status).toBe('released');
    });

    it('rejectRefund calls POST /refunds/:id/reject', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: { id: 1, status: 'rejected' } } });

      const result = await refundService.rejectRefund(1);

      expect(api.post).toHaveBeenCalledWith('/refunds/1/reject', { notes: undefined });
      expect(result.status).toBe('rejected');
    });
  });
});
