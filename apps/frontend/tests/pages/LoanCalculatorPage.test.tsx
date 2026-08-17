import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import LoanCalculatorPage from '../../src/pages/LoanCalculatorPage';

vi.mock('../../src/services/loanService');
vi.mock('../../src/services/clientService');

import { calculateLoan } from '../../src/services/loanService';
import { getClients } from '../../src/services/clientService';

function renderCalculator() {
  return render(
    <MemoryRouter>
      <LoanCalculatorPage />
    </MemoryRouter>,
  );
}

function renderCalculatorWithRoute(path: string, state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/reloan/calculate/:clientId" element={<LoanCalculatorPage />} />
        <Route path="/loans/calculator" element={<LoanCalculatorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const mockClient = {
  id: 42,
  name: 'Test Borrower',
  is_active: true,
  address: null,
  work: null,
  work_address: null,
  contact_number: '09123456789',
  social_media: null,
  notes: null,
  photo: null,
  photo_url: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  deleted_at: null,
  loans_count: 2,
  loans_by_status: '{"active":1,"past_due":1}',
};

describe('LoanCalculatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calculator form inputs', () => {
    renderCalculator();

    expect(screen.getByText('Loan Calculator')).toBeInTheDocument();
  });

  it('renders amount input with default gross amount label', () => {
    renderCalculator();

    const amountInput = screen.getByRole('textbox', { name: /Gross Amount/ });
    expect(amountInput).toBeInTheDocument();
  });

  it('renders term installments select with default 4', () => {
    renderCalculator();

    const termSelect = screen.getByLabelText('Number of installments') as HTMLSelectElement;
    expect(termSelect).toBeInTheDocument();
    expect(termSelect.value).toBe('4');
  });

  it('switches term to months and calculates with month selection', async () => {
    const mockResult = {
      amount: 10000,
      term_months: 4,
      interest_rate_per_month: 10,
      total_interest: 4000,
      net_proceeds: 6000,
      total_installments: 8,
      installment_amount: 1250,
      schedule: [],
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    renderCalculator();

    await userEvent.click(screen.getByLabelText('Months'));
    const termSelect = screen.getByLabelText('Number of months') as HTMLSelectElement;
    await userEvent.selectOptions(termSelect, '4');

    const amountInput = screen.getByRole('textbox', { name: /Gross Amount/ });
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.type(amountInput, '10000');
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(calculateLoan).toHaveBeenCalledWith({
        amount: 10000,
        term_months: 4,
        interest_rate_per_month: 10,
        client_id: undefined,
        first_payment_due_date: undefined,
        calculation_type: 'gross_amount',
      });
    });
  });

  it('renders interest rate input with default 10', () => {
    renderCalculator();

    const rateInput = screen.getByLabelText(/Interest Rate/);
    expect(rateInput).toBeInTheDocument();
    expect(rateInput).toHaveDisplayValue('10');
  });

  it('renders calculate button', () => {
    renderCalculator();

    expect(screen.getByRole('button', { name: 'Calculate' })).toBeInTheDocument();
  });

  it('renders initial empty state message', () => {
    renderCalculator();

    expect(
      screen.getByText('Enter loan details and click Calculate to see results.'),
    ).toBeInTheDocument();
  });

  it('shows error when submitting without amount', () => {
    renderCalculator();

    const form = document.querySelector('form');
    fireEvent.submit(form!);

    expect(
      screen.getByText('Amount and Term are required.'),
    ).toBeInTheDocument();
  });

  it('renders borrower lookup input', () => {
    renderCalculator();

    expect(screen.getByLabelText('Borrower')).toBeInTheDocument();
  });

  it('renders first payment due date input', () => {
    renderCalculator();

    expect(screen.getByLabelText('First Payment Due Date')).toBeInTheDocument();
  });

  it('calls calculateLoan with correct params', async () => {
    const mockResult = {
      amount: 10000,
      term_months: 3,
      interest_rate_per_month: 10,
      total_interest: 3000,
      net_proceeds: 7000,
      total_installments: 6,
      installment_amount: 1666.67,
      schedule: [
        { installment_number: 1, due_date: '2026-09-01', amount: 1666.67 },
        { installment_number: 2, due_date: '2026-09-15', amount: 1666.67 },
      ],
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    renderCalculator();

    const amountInput = screen.getByRole('textbox', { name: /Gross Amount/ });
    const termSelect = screen.getByLabelText('Number of installments');
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.type(amountInput, '10000');
    await userEvent.selectOptions(termSelect, '6');
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(calculateLoan).toHaveBeenCalledWith({
        amount: 10000,
        term_months: 3,
        interest_rate_per_month: 10,
        client_id: undefined,
        first_payment_due_date: undefined,
        calculation_type: 'gross_amount',
      });
    });
  });

  it('shows result summary cards after calculation', async () => {
    const mockResult = {
      amount: 10000,
      term_months: 3,
      interest_rate_per_month: 10,
      total_interest: 3000,
      net_proceeds: 7000,
      total_installments: 6,
      installment_amount: 1666.67,
      schedule: [
        { installment_number: 1, due_date: '2026-09-01', amount: 1666.67 },
        { installment_number: 2, due_date: '2026-09-15', amount: 1666.67 },
      ],
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    renderCalculator();

    const amountInput = screen.getByRole('textbox', { name: /Gross Amount/ });
    const termSelect = screen.getByLabelText('Number of installments');
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.type(amountInput, '10000');
    await userEvent.selectOptions(termSelect, '6');
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(screen.getByText('Net Proceeds', { selector: '.text-white-50' })).toBeInTheDocument();
      expect(screen.getByText('Total Interest')).toBeInTheDocument();
      expect(screen.getByText('Installment Amount')).toBeInTheDocument();
      expect(screen.getByText('Gross Loan Amount')).toBeInTheDocument();
    });
  });

  it('shows amortization schedule after calculation', async () => {
    const mockResult = {
      amount: 10000,
      term_months: 3,
      interest_rate_per_month: 10,
      total_interest: 3000,
      net_proceeds: 7000,
      total_installments: 6,
      installment_amount: 1666.67,
      schedule: [
        { installment_number: 1, due_date: '2026-09-01', amount: 1666.67 },
        { installment_number: 2, due_date: '2026-09-15', amount: 1666.67 },
      ],
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    renderCalculator();

    const amountInput = screen.getByRole('textbox', { name: /Gross Amount/ });
    const termSelect = screen.getByLabelText('Number of installments');
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.type(amountInput, '10000');
    await userEvent.selectOptions(termSelect, '6');
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(screen.getByText('Amortization Schedule')).toBeInTheDocument();
    });
  });

  it('shows reloan info when client_id and existing loans exist', async () => {
    const mockResult = {
      amount: 10000,
      term_months: 3,
      interest_rate_per_month: 10,
      total_interest: 3000,
      net_proceeds: 7000,
      total_installments: 6,
      installment_amount: 1666.67,
      schedule: [],
      existing_loans: [
        { id: 50, amount: 5000, remaining_balance: 2000, loan_status: 'active', term_months: 3 },
      ],
      total_existing_balance: 2000,
      net_proceeds_after_deduction: 5000,
      total_exposure: 15000,
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockClient],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, per_page: 8, to: 1, total: 1 },
    });

    renderCalculatorWithRoute('/reloan/calculate/1', {
      amount: 5000,
      termMonths: 3,
      clientName: 'Test Borrower',
      remainingBalance: 2000,
      parentLoanId: 50,
    });

    const amountInput = screen.getByRole('textbox', { name: /Gross Amount/ });
    const termSelect = screen.getByLabelText('Number of months');
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '10000');
    await userEvent.selectOptions(termSelect, '3');

    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(screen.getByText('Net Proceeds', { selector: '.text-white-50' })).toBeInTheDocument();
    });
  });

  it('shows Apply for Loan button when client_id and result exist', async () => {
    const mockResult = {
      amount: 10000,
      term_months: 3,
      interest_rate_per_month: 10,
      total_interest: 3000,
      net_proceeds: 7000,
      total_installments: 6,
      installment_amount: 1666.67,
      schedule: [],
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockClient],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, per_page: 8, to: 1, total: 1 },
    });

    renderCalculator();

    const amountInput = screen.getByRole('textbox', { name: /Gross Amount/ });
    const termSelect = screen.getByLabelText('Number of installments');
    const borrowerInput = screen.getByLabelText('Borrower');
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.type(amountInput, '10000');
    await userEvent.selectOptions(termSelect, '6');
    await userEvent.type(borrowerInput, 'Test');

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply for Loan' })).toBeInTheDocument();
    });
  });

  it('switches label when toggling to monthly installment', async () => {
    renderCalculator();

    const monthlyRadio = screen.getByLabelText('Monthly Installment');
    await userEvent.click(monthlyRadio);

    expect(screen.getByRole('textbox', { name: /Monthly Installment/ })).toBeInTheDocument();
  });

  it('sends calculation_type monthly_installment when toggled', async () => {
    const mockResult = {
      amount: 5000,
      term_months: 3,
      interest_rate_per_month: 10,
      total_interest: 1500,
      net_proceeds: 3500,
      total_installments: 6,
      installment_amount: 833.33,
      schedule: [],
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    renderCalculator();

    const monthlyRadio = screen.getByLabelText('Monthly Installment');
    await userEvent.click(monthlyRadio);

    const amountInput = screen.getByRole('textbox', { name: /Monthly Installment/ });
    const termSelect = screen.getByLabelText('Number of installments');
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.type(amountInput, '833.33');
    await userEvent.selectOptions(termSelect, '6');
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(calculateLoan).toHaveBeenCalledWith({
        amount: 833.33,
        term_months: 3,
        interest_rate_per_month: 10,
        client_id: undefined,
        first_payment_due_date: undefined,
        calculation_type: 'monthly_installment',
      });
    });
  });

  it('sends calculation_type net_proceeds when toggled', async () => {
    const mockResult = {
      amount: 10000,
      term_months: 3,
      interest_rate_per_month: 10,
      total_interest: 3000,
      net_proceeds: 7000,
      total_installments: 6,
      installment_amount: 1666.67,
      schedule: [],
    };
    (calculateLoan as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    renderCalculator();

    const netRadio = screen.getByLabelText('Net Proceeds');
    await userEvent.click(netRadio);

    const amountInput = screen.getByRole('textbox', { name: /Net Proceeds/ });
    const termSelect = screen.getByLabelText('Number of installments');
    const calculateButton = screen.getByRole('button', { name: 'Calculate' });

    await userEvent.type(amountInput, '7000');
    await userEvent.selectOptions(termSelect, '6');
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(calculateLoan).toHaveBeenCalledWith({
        amount: 7000,
        term_months: 3,
        interest_rate_per_month: 10,
        client_id: undefined,
        first_payment_due_date: undefined,
        calculation_type: 'net_proceeds',
      });
    });
  });
});
