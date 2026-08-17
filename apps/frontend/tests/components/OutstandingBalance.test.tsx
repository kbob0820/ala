import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutstandingBalance } from '../../src/components/OutstandingBalance';

const loans = [
  { id: 1, amount: 10000, remaining_balance: 4000, loan_status: 'active' as const, term_months: 3 },
  { id: 2, amount: 5000, remaining_balance: 2000, loan_status: 'past_due' as const, term_months: 2 },
] as const;

describe('OutstandingBalance', () => {
  it('renders a table with loan details', () => {
    render(<OutstandingBalance loans={loans} />);
    expect(screen.getByText('Loan #')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders individual loan amounts', () => {
    render(<OutstandingBalance loans={loans} />);
    expect(screen.getByText(/₱10,000/)).toBeInTheDocument();
    expect(screen.getByText(/₱5,000/)).toBeInTheDocument();
  });

  it('renders remaining balances', () => {
    render(<OutstandingBalance loans={loans} />);
    expect(screen.getByText(/₱4,000/)).toBeInTheDocument();
    expect(screen.getByText(/₱2,000/)).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<OutstandingBalance loans={loans} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Past Due')).toBeInTheDocument();
  });

  it('renders empty message when no loans', () => {
    render(<OutstandingBalance loans={[]} />);
    expect(screen.getByText('No loans')).toBeInTheDocument();
  });

  it('renders loan IDs', () => {
    render(<OutstandingBalance loans={loans} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
