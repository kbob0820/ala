import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import * as loanService from '../../src/services/loanService';
import api from '../../src/services/api';

describe('loanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLoans', () => {
    it('calls GET /loans with filters', async () => {
      const mockResponse = {
        data: {
          data: { data: [], links: { first: null, last: null, prev: null, next: null }, meta: { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null } },
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await loanService.getLoans({ application_status: 'submitted', search: 'john' });

      expect(api.get).toHaveBeenCalledWith('/loans', {
        params: { application_status: 'submitted', search: 'john' },
      });
    });

    it('returns paginated response for getLoans', async () => {
      const loans = [
        { id: 1, client_id: 1, amount: 10000, application_status: 'approved', loan_status: 'active' },
        { id: 2, client_id: 2, amount: 5000, application_status: 'draft', loan_status: null },
      ];
      const mockResponse = {
        data: {
          data: {
            data: loans,
            links: { first: null, last: null, prev: null, next: '/loans?page=2' },
            meta: { current_page: 1, last_page: 3, per_page: 15, total: 30, from: 1, to: 15 },
          },
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.getLoans({ page: 1 });

      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('getLoan', () => {
    it('calls GET /loans/:id', async () => {
      const loan = { id: 1, client_id: 1, amount: 10000, application_status: 'approved' };
      const mockResponse = { data: { data: loan } };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.getLoan(1);

      expect(api.get).toHaveBeenCalledWith('/loans/1');
      expect(result).toEqual(loan);
    });
  });

  describe('calculateLoan', () => {
    it('calls POST /loans/calculate with body', async () => {
      const calculation = { amount: 10000, term_months: 3, interest_rate_per_month: 10, total_interest: 3000, net_proceeds: 7000, total_installments: 6, installment_amount: 1666.67, schedule: [] };
      const mockResponse = { data: { data: calculation } };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.calculateLoan({ amount: 10000, term_months: 3 });

      expect(api.post).toHaveBeenCalledWith('/loans/calculate', { amount: 10000, term_months: 3 });
      expect(result).toEqual(calculation);
    });

    it('sends client_id for reloan', async () => {
      const mockResponse = { data: { data: {} } };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await loanService.calculateLoan({ amount: 10000, term_months: 3, client_id: 42 });

      expect(api.post).toHaveBeenCalledWith('/loans/calculate', { amount: 10000, term_months: 3, client_id: 42 });
    });
  });

  describe('createLoan', () => {
    it('calls POST /loans', async () => {
      const loan = { id: 3, client_id: 1, amount: 10000 };
      const mockResponse = { data: { data: loan } };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.createLoan({
        client_id: 1,
        amount: 10000,
        term_months: 3,
        interest_rate_per_month: 10,
      });

      expect(api.post).toHaveBeenCalledWith('/loans', {
        client_id: 1,
        amount: 10000,
        term_months: 3,
        interest_rate_per_month: 10,
      });
      expect(result).toEqual(loan);
    });
  });

  describe('submitLoan', () => {
    it('calls PUT /loans/:id/submit', async () => {
      const loan = { id: 1, application_status: 'submitted' };
      const mockResponse = { data: { data: loan } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.submitLoan(1);

      expect(api.put).toHaveBeenCalledWith('/loans/1/submit');
      expect(result).toEqual(loan);
    });
  });

  describe('approveLoan', () => {
    it('calls PUT /loans/:id/approve', async () => {
      const loan = { id: 1, application_status: 'approved' };
      const mockResponse = { data: { data: loan } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.approveLoan(1);

      expect(api.put).toHaveBeenCalledWith('/loans/1/approve', {});
      expect(result).toEqual(loan);
    });

    it('sends modification data when provided', async () => {
      const mockResponse = { data: { data: {} } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await loanService.approveLoan(1, { amount: 8000, term_months: 2 });

      expect(api.put).toHaveBeenCalledWith('/loans/1/approve', { amount: 8000, term_months: 2 });
    });
  });

  describe('rejectLoan', () => {
    it('calls PUT /loans/:id/reject', async () => {
      const loan = { id: 1, application_status: 'rejected' };
      const mockResponse = { data: { data: loan } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.rejectLoan(1);

      expect(api.put).toHaveBeenCalledWith('/loans/1/reject');
      expect(result).toEqual(loan);
    });
  });

  describe('releaseLoan', () => {
    it('calls POST /loans/:id/release with FormData', async () => {
      const loan = { id: 1, loan_status: 'active' };
      const mockResponse = { data: { data: loan } };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('amount', '5000');

      const result = await loanService.releaseLoan(1, formData);

      expect(api.post).toHaveBeenCalledWith('/loans/1/release', formData);
      expect(result).toEqual(loan);
    });
  });

  describe('cancelLoan', () => {
    it('calls PUT /loans/:id/cancel', async () => {
      const loan = { id: 1, application_status: 'cancelled' };
      const mockResponse = { data: { data: loan } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.cancelLoan(1);

      expect(api.put).toHaveBeenCalledWith('/loans/1/cancel');
      expect(result).toEqual(loan);
    });
  });

  describe('updateReviewStatus', () => {
    it('calls PUT with application_status', async () => {
      const mockResponse = { data: { data: {} } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await loanService.updateReviewStatus(1, 'under_review');

      expect(api.put).toHaveBeenCalledWith('/loans/1/review-status', { application_status: 'under_review' });
    });
  });

  describe('updateCollectionStatus', () => {
    it('calls PUT with collection_status', async () => {
      const mockResponse = { data: { data: {} } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await loanService.updateCollectionStatus(1, 'reminder_sent');

      expect(api.put).toHaveBeenCalledWith('/loans/1/collection-status', { collection_status: 'reminder_sent' });
    });
  });

  describe('undoPastDue', () => {
    it('calls POST /loans/:id/past-due/undo', async () => {
      const mockResponse = {
        data: {
          data: {
            late_fees_reversed: 1,
            installments_reverted: 1,
            loans_reverted: 1,
          },
        },
      };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.undoPastDue(1);

      expect(api.post).toHaveBeenCalledWith('/loans/1/past-due/undo');
      expect(result).toEqual({
        late_fees_reversed: 1,
        installments_reverted: 1,
        loans_reverted: 1,
      });
    });
  });

  describe('updateInstallmentLateFee', () => {
    it('calls POST /loans/:id/installments/:iid/late-fee', async () => {
      const charge = { id: 9, loan_id: 1, charge_type: 'LATE_FEE', original_amount: 750 };
      const mockResponse = { data: { data: charge } };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.updateInstallmentLateFee(1, 5, 750);

      expect(api.post).toHaveBeenCalledWith('/loans/1/installments/5/late-fee', {
        amount: 750,
      });
      expect(result).toEqual(charge);
    });
  });

  describe('processPastDueLoan', () => {
    it('calls POST /loans/:id/past-due/process with installments', async () => {
      const mockResponse = {
        data: {
          data: {
            overdue_schedules: 2,
            past_due_marked: 2,
            late_fees_assessed: 1,
            loans_updated: 1,
          },
        },
      };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.processPastDueLoan(1, [
        { id: 5, late_fee: 500 },
        { id: 6, late_fee: 0 },
      ]);

      expect(api.post).toHaveBeenCalledWith('/loans/1/past-due/process', {
        installments: [
          { id: 5, late_fee: 500 },
          { id: 6, late_fee: 0 },
        ],
      });
      expect(result).toEqual({
        overdue_schedules: 2,
        past_due_marked: 2,
        late_fees_assessed: 1,
        loans_updated: 1,
      });
    });
  });

  describe('getOutstanding', () => {
    it('calls GET /loans/:id/outstanding', async () => {
      const breakdown = {
        loan_id: 1,
        loan_number: 'LN-2026-00001',
        amount: 5000,
        remaining_balance: 3000,
        past_due_amount: 1500,
        late_fees: 500,
        other_charges: 100,
        total_outstanding: 3600,
      };
      const mockResponse = { data: { data: breakdown } };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.getOutstanding(1);

      expect(api.get).toHaveBeenCalledWith('/loans/1/outstanding');
      expect(result).toEqual(breakdown);
    });
  });

  describe('getPastDueLoans', () => {
    it('calls GET /loans/past-due with params', async () => {
      const pastDueLoans = [
        { id: 1, client: { id: 1, name: 'Alice', contact_number: null }, amount: 5000, loan_status: 'past_due', collection_status: null, overdue_installments: [] },
      ];
      const mockResponse = {
        data: {
          data: {
            data: pastDueLoans,
            links: { first: null, last: null, prev: null, next: null },
            meta: { current_page: 1, last_page: 1, per_page: 15, total: 1, from: 1, to: 1 },
          },
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.getPastDueLoans({ per_page: 10, page: 1 });

      expect(api.get).toHaveBeenCalledWith('/loans/past-due', { params: { per_page: 10, page: 1 } });
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('updateLoan', () => {
    it('calls PUT /loans/:id', async () => {
      const loan = { id: 1, amount: 8000, term_months: 2 };
      const mockResponse = { data: { data: loan } };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await loanService.updateLoan(1, {
        amount: 8000,
        term_months: 2,
        interest_rate_per_month: 12,
      });

      expect(api.put).toHaveBeenCalledWith('/loans/1', {
        amount: 8000,
        term_months: 2,
        interest_rate_per_month: 12,
      });
      expect(result).toEqual(loan);
    });
  });
});
