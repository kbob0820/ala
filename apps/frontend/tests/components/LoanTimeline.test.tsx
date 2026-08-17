import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoanTimeline } from '../../src/components/LoanTimeline';
import type { Loan } from '../../src/types';

function createLoan(overrides: Partial<Loan> = {}): Loan {
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
    application_status: 'draft',
    loan_status: null,
    collection_status: null,
    amount: 10000,
    total_interest: 3000,
    net_proceeds: 7000,
    installment_amount: 1666.67,
    total_installments: 6,
    approved_at: null,
    released_at: null,
    closed_at: null,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    deleted_at: null,
    created_by_user: { id: 1, name: 'Officer John', email: 'john@test.com', role_id: 1, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ...overrides,
  };
}

describe('LoanTimeline', () => {
  it('renders timeline for draft loan', () => {
    const loan = createLoan({ application_status: 'draft' });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Loan application created by Officer John')).toBeInTheDocument();
    expect(screen.getByText('Status Timeline')).toBeInTheDocument();
  });

  it('renders timeline for active loan', () => {
    const loan = createLoan({
      application_status: 'draft',
      loan_status: 'active',
      approved_at: '2026-08-02T10:00:00Z',
      released_at: '2026-08-03T10:00:00Z',
      approved_by_user: { id: 2, name: 'Manager Jane', email: 'jane@test.com', role_id: 2, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
    });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByText('In repayment')).toBeInTheDocument();
    expect(screen.getByText('Released')).toBeInTheDocument();
  });

  it('renders timeline for fully paid loan', () => {
    const loan = createLoan({
      application_status: 'draft',
      loan_status: 'fully_paid',
      approved_at: '2026-08-02T10:00:00Z',
      released_at: '2026-08-03T10:00:00Z',
      closed_at: '2026-08-05T10:00:00Z',
    });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders timeline for past due loan and shows error icon', () => {
    const loan = createLoan({
      application_status: 'draft',
      loan_status: 'past_due',
      approved_at: '2026-08-02T10:00:00Z',
      released_at: '2026-08-03T10:00:00Z',
    });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Has overdue installments')).toBeInTheDocument();
  });

  it('displays status badge', () => {
    const loan = createLoan({ application_status: 'draft' });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows creator name when available', () => {
    const loan = createLoan({ application_status: 'draft' });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('Loan application created by Officer John')).toBeInTheDocument();
  });

  it('renders timeline for rejected loan', () => {
    const loan = createLoan({ application_status: 'rejected', updated_at: '2026-08-04T10:00:00Z' });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('Application rejected')).toBeInTheDocument();
  });

  it('renders timeline for cancelled loan', () => {
    const loan = createLoan({ application_status: 'cancelled', updated_at: '2026-08-04T10:00:00Z' });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('Application cancelled')).toBeInTheDocument();
  });

  it('renders timeline for defaulted loan', () => {
    const loan = createLoan({
      application_status: 'draft',
      loan_status: 'defaulted',
      approved_at: '2026-08-02T10:00:00Z',
      released_at: '2026-08-03T10:00:00Z',
    });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getAllByText('Defaulted')).toHaveLength(2);
    expect(screen.getByText('90+ days overdue')).toBeInTheDocument();
  });

  it('renders settled by reloan flow for a loan with approved application status', () => {
    const loan = createLoan({
      application_status: 'approved',
      loan_status: 'settled_by_reloan',
      approved_at: '2026-08-02T10:00:00Z',
      released_at: '2026-08-03T10:00:00Z',
      closed_at: '2026-08-05T10:00:00Z',
    });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getAllByText('Settled by Reloan').length).toBeGreaterThan(0);
    expect(screen.getByText(/Settled by reloan on/)).toBeInTheDocument();
    expect(screen.queryByText('Awaiting cashier release')).not.toBeInTheDocument();
  });

  it('renders active flow for a loan with approved application status', () => {
    const loan = createLoan({
      application_status: 'approved',
      loan_status: 'active',
      approved_at: '2026-08-02T10:00:00Z',
      released_at: '2026-08-03T10:00:00Z',
    });
    render(<LoanTimeline loan={loan} />);

    expect(screen.getByText('In repayment')).toBeInTheDocument();
    expect(screen.queryByText('Awaiting cashier release')).not.toBeInTheDocument();
  });
});
