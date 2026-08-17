import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetLoans = vi.fn();
const mockGetLoanPayments = vi.fn();

vi.mock('../../src/services/loanService', () => ({
  getLoans: (...args: unknown[]) => mockGetLoans(...args),
}));

vi.mock('../../src/services/paymentService', () => ({
  getLoanPayments: (...args: unknown[]) => mockGetLoanPayments(...args),
}));

import * as reportService from '../../src/services/reportService';
import type { Loan, Payment } from '../../src/types';

function createLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    client_id: 1,
    parent_loan_id: null,
    loan_type: 'regular',
    loan_number: null,
    created_by: null,
    approved_by: null,
    term_months: 3,
    interest_rate_per_month: 10,
    charges: 0,
    charges_description: null,
    old_balance_settlement: 0,
    total_deductions: 0,
    first_payment_due_date: null,
    application_status: 'approved',
    loan_status: 'active',
    collection_status: null,
    amount: 10000,
    total_interest: 3000,
    net_proceeds: 7000,
    installment_amount: 1666.67,
    total_installments: 6,
    approved_at: '2026-06-01T00:00:00Z',
    released_at: '2026-06-01T00:00:00Z',
    closed_at: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    loan_id: 1,
    client_id: 1,
    amount: 5000,
    payment_method: 'Cash',
    payment_date: '2026-08-01',
    notes: null,
    proof_image: null,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

const mockLoans: Loan[] = [
  createLoan({ id: 1, amount: 10000, loan_status: 'active', released_at: '2026-06-01T00:00:00Z', client: { id: 1, name: 'Alice' } }),
  createLoan({ id: 2, amount: 5000, loan_status: 'fully_paid', released_at: '2026-05-01T00:00:00Z', client: { id: 2, name: 'Bob' } }),
  createLoan({ id: 3, amount: 8000, loan_status: 'past_due', released_at: '2026-01-01T00:00:00Z', client: { id: 3, name: 'Charlie' } }),
];

const paymentsForLoan1: Payment[] = [
  createPayment({ id: 1, loan_id: 1, payment_method: 'Cash', amount: 5000, payment_date: '2026-08-01' }),
  createPayment({ id: 2, loan_id: 1, payment_method: 'GCash', amount: 3000, payment_date: '2026-08-02' }),
  createPayment({ id: 3, loan_id: 1, payment_method: 'BPI', amount: 2000, payment_date: '2026-08-03' }),
];

const paymentsForLoan2: Payment[] = [
  createPayment({ id: 4, loan_id: 2, payment_method: 'Cash', amount: 5000, payment_date: '2026-08-01' }),
  createPayment({ id: 5, loan_id: 2, payment_method: 'GCash', amount: 3000, payment_date: '2026-08-02' }),
  createPayment({ id: 6, loan_id: 2, payment_method: 'BPI', amount: 2000, payment_date: '2026-08-03' }),
];

const paymentsForLoan3: Payment[] = [
  createPayment({ id: 7, loan_id: 3, payment_method: 'Cash', amount: 5000, payment_date: '2026-08-01' }),
  createPayment({ id: 8, loan_id: 3, payment_method: 'GCash', amount: 3000, payment_date: '2026-08-02' }),
  createPayment({ id: 9, loan_id: 3, payment_method: 'BPI', amount: 2000, payment_date: '2026-08-03' }),
];

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDailyCollections', () => {
    it('groups payments by date', async () => {
      mockGetLoans.mockResolvedValue({ data: mockLoans });
      mockGetLoanPayments
        .mockResolvedValueOnce(paymentsForLoan1)
        .mockResolvedValueOnce(paymentsForLoan2)
        .mockResolvedValueOnce(paymentsForLoan3);

      const result = await reportService.generateDailyCollections();

      expect(result.length).toBe(3);
      const dates = result.map((r) => r.date).sort();
      expect(dates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    });

    it('computes correct totals', async () => {
      mockGetLoans.mockResolvedValue({ data: mockLoans });
      mockGetLoanPayments
        .mockResolvedValueOnce(paymentsForLoan1)
        .mockResolvedValueOnce(paymentsForLoan2)
        .mockResolvedValueOnce(paymentsForLoan3);

      const result = await reportService.generateDailyCollections();

      const aug01 = result.find((r) => r.date === '2026-08-01')!;
      expect(aug01.count).toBe(3);
      expect(aug01.total).toBe(15000);
      expect(aug01.cash).toBe(15000);
      expect(aug01.gcash).toBe(0);
      expect(aug01.bpi).toBe(0);
    });

    it('filters by date range', async () => {
      mockGetLoans.mockResolvedValue({ data: mockLoans });
      mockGetLoanPayments
        .mockResolvedValueOnce(paymentsForLoan1)
        .mockResolvedValueOnce(paymentsForLoan2)
        .mockResolvedValueOnce(paymentsForLoan3);

      const result = await reportService.generateDailyCollections('2026-08-01', '2026-08-01');

      expect(result.length).toBe(1);
      expect(result[0].date).toBe('2026-08-01');
    });

    it('returns empty array when no payments', async () => {
      mockGetLoans.mockResolvedValue({ data: [] });

      const result = await reportService.generateDailyCollections();

      expect(result).toEqual([]);
    });
  });

  describe('generateMonthlyCollections', () => {
    it('aggregates by month', async () => {
      mockGetLoans.mockResolvedValue({ data: mockLoans });
      mockGetLoanPayments
        .mockResolvedValueOnce([
          createPayment({ id: 1, loan_id: 1, amount: 5000, payment_date: '2026-07-15' }),
          createPayment({ id: 2, loan_id: 1, amount: 3000, payment_date: '2026-08-01' }),
        ])
        .mockResolvedValueOnce([
          createPayment({ id: 3, loan_id: 2, amount: 2000, payment_date: '2026-07-20' }),
        ])
        .mockResolvedValueOnce([]);

      const result = await reportService.generateMonthlyCollections();

      expect(result.length).toBeGreaterThanOrEqual(1);
      const july = result.find((r) => r.month === '2026-07');
      expect(july).toBeDefined();
      expect(july!.total).toBe(7000);
    });
  });

  describe('generateAgingReport', () => {
    it('returns 5 buckets', async () => {
      mockGetLoans.mockResolvedValue({ data: [] });
      mockGetLoanPayments.mockResolvedValue([]);

      const result = await reportService.generateAgingReport();

      expect(result.length).toBe(5);
      expect(result[0].label).toBe('Current (0-30 days)');
      expect(result[1].label).toBe('31-60 days');
      expect(result[2].label).toBe('61-90 days');
      expect(result[3].label).toBe('91-180 days');
      expect(result[4].label).toBe('181+ days');
    });

    it('categorizes loans by age', async () => {
      const now = new Date();
      const daysAgo15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const daysAgo45 = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString();
      const daysAgo75 = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString();

      const agingLoans: Loan[] = [
        createLoan({ id: 1, amount: 10000, loan_status: 'active', released_at: daysAgo15, client_id: 1 }),
        createLoan({ id: 2, amount: 5000, loan_status: 'past_due', released_at: daysAgo45, client_id: 2 }),
        createLoan({ id: 3, amount: 3000, loan_status: 'delinquent', released_at: daysAgo75, client_id: 3 }),
      ];

      mockGetLoans.mockResolvedValue({ data: agingLoans });
      mockGetLoanPayments.mockResolvedValue([]);

      const result = await reportService.generateAgingReport();

      expect(result[0].count).toBe(1);
      expect(result[0].amount).toBe(10000);
      expect(result[1].count).toBe(1);
      expect(result[1].amount).toBe(5000);
      expect(result[2].count).toBe(1);
      expect(result[2].amount).toBe(3000);
    });
  });

  describe('generateLoanLedger', () => {
    it('returns null for non-existent loan', async () => {
      mockGetLoans.mockResolvedValue({ data: mockLoans });
      mockGetLoanPayments.mockResolvedValue([]);

      const result = await reportService.generateLoanLedger(999);

      expect(result).toBeNull();
    });

    it('creates entries for payments', async () => {
      mockGetLoans.mockResolvedValue({ data: mockLoans });
      mockGetLoanPayments.mockResolvedValue([paymentsForLoan1[0], paymentsForLoan1[1]]);

      const result = await reportService.generateLoanLedger(1);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(3);
      expect(result![0].description).toContain('Released');
      expect(result![1].description).toContain('Cash');
      expect(result![2].description).toContain('GCash');
    });
  });

  describe('generateBorrowerSummary', () => {
    it('groups by client', async () => {
      const clientLoans: Loan[] = [
        createLoan({
          id: 1, client_id: 1, amount: 10000, loan_status: 'active',
          client: { id: 1, name: 'Alice' },
        }),
        createLoan({
          id: 2, client_id: 1, amount: 5000, loan_status: 'fully_paid',
          client: { id: 1, name: 'Alice' },
        }),
        createLoan({
          id: 3, client_id: 2, amount: 8000, loan_status: 'active',
          client: { id: 2, name: 'Bob' },
        }),
      ];

      mockGetLoans.mockResolvedValue({ data: clientLoans });
      mockGetLoanPayments.mockResolvedValue([]);

      const result = await reportService.generateBorrowerSummary();

      expect(result.length).toBe(2);
      const alice = result.find((r) => r.clientId === 1)!;
      expect(alice).toBeDefined();
      expect(alice.totalLoans).toBe(2);
      expect(alice.totalBorrowed).toBe(15000);
      const bob = result.find((r) => r.clientId === 2)!;
      expect(bob.totalLoans).toBe(1);
      expect(bob.totalBorrowed).toBe(8000);
    });
  });
});
