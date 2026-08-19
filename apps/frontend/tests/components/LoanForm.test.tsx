import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoanForm } from '../../src/components/LoanForm';

function renderLoanForm(overrides: Partial<Parameters<typeof LoanForm>[0]> = {}) {
  const props = {
    clientId: 1,
    borrowerName: 'Test Borrower',
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    submitLabel: 'Create Loan',
    loading: false,
    error: null,
    mode: 'create' as const,
    ...overrides,
  };
  const utils = render(<LoanForm {...props} />);
  return { ...utils, props };
}

describe('LoanForm', () => {
  it('renders loan details card with borrower name', () => {
    renderLoanForm();
    expect(screen.getByText('Loan Details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Borrower (#1)')).toBeInTheDocument();
  });

  it('renders gross loan amount input', () => {
    renderLoanForm();
    expect(screen.getByLabelText(/Gross Loan Amount/)).toBeInTheDocument();
  });

  it('renders term months/installments toggle', () => {
    renderLoanForm();
    expect(screen.getByLabelText('Months')).toBeInTheDocument();
    expect(screen.getByLabelText('Installments')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of installments')).toBeInTheDocument();
  });

  it('renders interest rate input', () => {
    renderLoanForm();
    expect(screen.getByLabelText(/Interest Rate/)).toBeInTheDocument();
  });

  it('does not render charges input', () => {
    renderLoanForm();
    expect(screen.queryByLabelText(/Charges \/ Fees/)).toBeNull();
  });

  it('does not render old balance input for new loan', () => {
    renderLoanForm({ showReloanFields: false });
    expect(screen.queryByText('Old Balance')).toBeNull();
  });

  it('renders old balance section when showReloanFields is true', () => {
    renderLoanForm({
      showReloanFields: true,
      initialData: { old_balance_settlement: '2500' },
    });
    expect(screen.getByText('Old Balance')).toBeInTheDocument();
  });

  it('renders first payment due date input', () => {
    renderLoanForm();
    expect(screen.getByLabelText(/First Payment Due Date/)).toBeInTheDocument();
  });

  it('renders loan breakdown section with computed values', () => {
    renderLoanForm({
      initialData: {
        amount: '10000',
        term_months: '3',
        interest_rate_per_month: '10',
      },
    });

    expect(screen.getByText('Loan Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('Net Proceeds').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Installments').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render deductions for new loan', () => {
    renderLoanForm({ showReloanFields: false });
    expect(screen.queryByText('Total Deductions')).toBeNull();
  });

  it('renders deductions section when showReloanFields is true', () => {
    renderLoanForm({
      showReloanFields: true,
      initialData: { old_balance_settlement: '2500', charges: '500' },
    });
    expect(screen.getByText('Total Deductions (interest + charges)')).toBeInTheDocument();
  });

  it('renders actual release amount', () => {
    renderLoanForm();
    expect(screen.getByText('Actual Release')).toBeInTheDocument();
  });

  it('renders submit button with custom label', () => {
    renderLoanForm({ submitLabel: 'Create Loan' });
    expect(screen.getByRole('button', { name: 'Create Loan' })).toBeInTheDocument();
  });

  it('renders secondary button when secondaryLabel provided', () => {
    renderLoanForm({
      secondaryLabel: 'Submit for Approval',
      onSecondaryAction: vi.fn(),
    });
    expect(screen.getByRole('button', { name: 'Submit for Approval' })).toBeInTheDocument();
  });

  it('does not render secondary button when secondaryLabel not provided', () => {
    renderLoanForm();
    expect(screen.queryByRole('button', { name: 'Submit for Approval' })).toBeNull();
  });

  it('shows reloan breakdown when showReloanFields is true', () => {
    renderLoanForm({
      showReloanFields: true,
      initialData: { old_balance_settlement: '2500', charges: '500' },
    });

    expect(screen.getByText('Old Balance')).toBeInTheDocument();
    expect(screen.getByText('Total Deductions (interest + charges)')).toBeInTheDocument();
  });

  it('calls onSubmit with form data when submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderLoanForm({
      onSubmit,
      initialData: {
        amount: '10000',
        term_months: '3',
        interest_rate_per_month: '10',
        charges: '500',
        charges_description: 'Processing fee',
        old_balance_settlement: '0',
        guarantor: '',
        first_payment_due_date: '2026-08-15',
      },
    });

    const submitButton = screen.getByRole('button', { name: 'Create Loan' });
    await userEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '10000',
      term_months: '3',
      interest_rate_per_month: '10',
      charges: '500',
      charges_description: 'Processing fee',
      old_balance_settlement: '0',
      guarantor: '',
      first_payment_due_date: '2026-08-15',
      calculation_type: 'gross_amount',
    });
  });

  it('shows loading state on submit button', () => {
    renderLoanForm({ loading: true });
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows error alert when error provided', () => {
    renderLoanForm({ error: 'Failed to create loan' });
    expect(screen.getByText('Failed to create loan')).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    renderLoanForm();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
