import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoanComparison } from '../../src/components/LoanComparison';

const existingLoans = [
  { id: 1, amount: 10000, remaining_balance: 4000, loan_status: 'active' as const, term_months: 3 },
];

const newLoan = {
  amount: 20000,
  term_months: 3,
  net_proceeds: 14000,
  total_interest: 6000,
  installment_amount: 3333.33,
  total_installments: 6,
};

describe('LoanComparison', () => {
  it('renders existing loans section', () => {
    render(
      <LoanComparison
        existingLoans={existingLoans}
        newLoan={newLoan}
        totalExistingBalance={4000}
        netProceedsAfterDeduction={10000}
        totalExposure={24000}
      />
    );
    expect(screen.getByText(/Existing Loans/i)).toBeInTheDocument();
  });

  it('renders new loan section', () => {
    render(
      <LoanComparison
        existingLoans={existingLoans}
        newLoan={newLoan}
        totalExistingBalance={4000}
        netProceedsAfterDeduction={10000}
        totalExposure={24000}
      />
    );
    expect(screen.getByText(/New Loan/i)).toBeInTheDocument();
  });

  it('displays total existing balance', () => {
    render(
      <LoanComparison
        existingLoans={existingLoans}
        newLoan={newLoan}
        totalExistingBalance={4000}
        netProceedsAfterDeduction={10000}
        totalExposure={24000}
      />
    );
    expect(screen.getByText('Total Existing Balance:')).toBeInTheDocument();
  });

  it('displays net proceeds after deduction', () => {
    render(
      <LoanComparison
        existingLoans={existingLoans}
        newLoan={newLoan}
        totalExistingBalance={4000}
        netProceedsAfterDeduction={10000}
        totalExposure={24000}
      />
    );
    expect(screen.getByText('Net Proceeds After Deduction')).toBeInTheDocument();
  });

  it('displays total exposure', () => {
    render(
      <LoanComparison
        existingLoans={existingLoans}
        newLoan={newLoan}
        totalExistingBalance={4000}
        netProceedsAfterDeduction={10000}
        totalExposure={24000}
      />
    );
    expect(screen.getByText(/₱24,000/)).toBeInTheDocument();
  });

  it('shows auto-close warning message', () => {
    render(
      <LoanComparison
        existingLoans={existingLoans}
        newLoan={newLoan}
        totalExistingBalance={4000}
        netProceedsAfterDeduction={10000}
        totalExposure={24000}
      />
    );
    expect(screen.getByText(/auto-close/i)).toBeInTheDocument();
  });

  it('formats amounts as PHP', () => {
    render(
      <LoanComparison
        existingLoans={existingLoans}
        newLoan={newLoan}
        totalExistingBalance={4000}
        netProceedsAfterDeduction={10000}
        totalExposure={24000}
      />
    );
    const phpAmounts = screen.getAllByText(/₱/);
    expect(phpAmounts.length).toBeGreaterThanOrEqual(3);
  });
});
