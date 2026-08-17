import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentLedger } from '../../src/components/PaymentLedger';
import type { Payment } from '../../src/types';

function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    loan_id: 1,
    client_id: 1,
    amount: 1000,
    payment_method: 'cash',
    payment_date: '2026-08-01',
    notes: null,
    proof_image: null,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

const borrowerName = 'Juan Dela Cruz';
const loanAmount = 10000;

const payment1 = createPayment({
  id: 1,
  amount: 3000,
  payment_method: 'Cash',
  payment_date: '2026-08-01',
});

const payment2 = createPayment({
  id: 2,
  amount: 2000,
  payment_method: 'GCash',
  payment_date: '2026-08-15',
});

const payments = [payment1, payment2];

describe('PaymentLedger', () => {
  it('renders borrower name', () => {
    render(
      <PaymentLedger
        borrowerName={borrowerName}
        payments={payments}
        loanAmount={loanAmount}
      />,
    );

    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
  });

  it('renders opening balance', () => {
    render(
      <PaymentLedger
        borrowerName={borrowerName}
        payments={payments}
        loanAmount={loanAmount}
      />,
    );

    expect(screen.getByText('Opening Balance')).toBeInTheDocument();
  });

  it('renders first payment row with correct balance after payment', () => {
    render(
      <PaymentLedger
        borrowerName={borrowerName}
        payments={payments}
        loanAmount={loanAmount}
      />,
    );

    expect(screen.getByText(/3,000/)).toBeInTheDocument();
    expect(screen.getByText(/7,000/)).toBeInTheDocument();
  });

  it('renders second payment row', () => {
    render(
      <PaymentLedger
        borrowerName={borrowerName}
        payments={payments}
        loanAmount={loanAmount}
      />,
    );

    expect(screen.getByText(/2,000/)).toBeInTheDocument();
  });

  it('renders remaining balance', () => {
    render(
      <PaymentLedger
        borrowerName={borrowerName}
        payments={payments}
        loanAmount={loanAmount}
      />,
    );

    expect(screen.getByText('Remaining Balance')).toBeInTheDocument();
  });

  it('formats amounts as PHP', () => {
    render(
      <PaymentLedger
        borrowerName={borrowerName}
        payments={payments}
        loanAmount={loanAmount}
      />,
    );

    const pesoAmounts = screen.getAllByText(/₱/);
    expect(pesoAmounts.length).toBeGreaterThan(0);
  });

  it('shows "No payment transactions" when payments array empty', () => {
    render(
      <PaymentLedger
        borrowerName={borrowerName}
        payments={[]}
        loanAmount={loanAmount}
      />,
    );

    expect(screen.getByText(/No payment transactions/i)).toBeInTheDocument();
  });
});
