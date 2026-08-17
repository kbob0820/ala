import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoanListPage } from '../../src/pages/LoanListPage';

vi.mock('../../src/services/loanService');

import { getLoans } from '../../src/services/loanService';

const mockLoans = [
  {
    id: 1,
    client_id: 1,
    parent_loan_id: null,
    loan_type: 'regular',
    loan_number: null,
    client: { id: 1, name: 'Alice Santos', address: 'Manila', work: null, work_address: null, contact_number: null, social_media: null, notes: null, photo: null, photo_url: null, is_active: true, created_at: '2026-01-01', updated_at: '2026-06-01', deleted_at: null },
    amount: 10000,
    application_status: 'approved',
    loan_status: 'active',
    term_months: 3,
    created_at: '2026-08-01',
    interest_rate_per_month: 10,
    charges: 0,
    charges_description: null,
    old_balance_settlement: 0,
    total_deductions: 0,
    first_payment_due_date: null,
    collection_status: null,
    total_interest: 3000,
    net_proceeds: 7000,
    installment_amount: 1666.67,
    total_installments: 6,
    approved_at: null,
    released_at: null,
    closed_at: null,
    created_by: null,
    approved_by: null,
    updated_at: '2026-08-01',
    deleted_at: null,
  },
  {
    id: 2,
    client_id: 2,
    parent_loan_id: null,
    loan_type: 'regular',
    loan_number: null,
    client: { id: 2, name: 'Bob Reyes', address: 'QC', work: null, work_address: null, contact_number: null, social_media: null, notes: null, photo: null, photo_url: null, is_active: true, created_at: '2026-01-01', updated_at: '2026-06-01', deleted_at: null },
    amount: 5000,
    application_status: 'submitted',
    loan_status: null,
    term_months: 2,
    created_at: '2026-08-02',
    interest_rate_per_month: 10,
    charges: 0,
    charges_description: null,
    old_balance_settlement: 0,
    total_deductions: 0,
    first_payment_due_date: null,
    collection_status: null,
    total_interest: 1000,
    net_proceeds: 4000,
    installment_amount: 1250,
    total_installments: 4,
    approved_at: null,
    released_at: null,
    closed_at: null,
    created_by: null,
    approved_by: null,
    updated_at: '2026-08-02',
    deleted_at: null,
  },
  {
    id: 3,
    client_id: 3,
    parent_loan_id: null,
    loan_type: 'regular',
    loan_number: null,
    client: { id: 3, name: 'Carla Gomez', address: 'Makati', work: null, work_address: null, contact_number: null, social_media: null, notes: null, photo: null, photo_url: null, is_active: true, created_at: '2026-01-01', updated_at: '2026-06-01', deleted_at: null },
    amount: 15000,
    application_status: 'approved',
    loan_status: 'past_due',
    term_months: 4,
    created_at: '2026-08-03',
    interest_rate_per_month: 12,
    charges: 0,
    charges_description: null,
    old_balance_settlement: 0,
    total_deductions: 0,
    first_payment_due_date: null,
    collection_status: null,
    total_interest: 7200,
    net_proceeds: 7800,
    installment_amount: 1875,
    total_installments: 8,
    approved_at: null,
    released_at: null,
    closed_at: null,
    created_by: null,
    approved_by: null,
    updated_at: '2026-08-03',
    deleted_at: null,
  },
];

const mockPaginatedResponse = {
  data: mockLoans,
  links: { first: null, last: null, prev: null, next: null },
  meta: { current_page: 1, last_page: 1, per_page: 15, total: 3, from: 1, to: 3 },
};

describe('LoanListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLoans as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
  });

  it('renders page heading Loan Management', async () => {
    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const headings = screen.getAllByText('Loan Management');
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders New Loan link', async () => {
    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'New Loan' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/loans/calculator');
    });
  });

  it('renders filter dropdowns', async () => {
    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Submitted' })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
  });

  it('renders loans table after loading', async () => {
    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Alice Santos' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Bob Reyes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Carla Gomez' })).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    (getLoans as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    const spinner = document.querySelector('.spinner-border');
    expect(spinner).toBeInTheDocument();
  });

  it('shows empty state when no loans', async () => {
    (getLoans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null },
    });

    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No loans found')).toBeInTheDocument();
    });
  });

  it('shows View button per loan', async () => {
    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('link', { name: 'View' });
      expect(viewButtons).toHaveLength(3);
    });
  });

  it('marks regular loans as New and reloans as Reloan', async () => {
    const reloan = { ...mockLoans[0], id: 99, loan_type: 'reloan', client: { ...mockLoans[0].client, name: 'Diane Lim' } };
    (getLoans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockLoans[0], reloan],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 2, from: 1, to: 2 },
    });

    render(
      <MemoryRouter>
        <LoanListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Diane Lim' })).toBeInTheDocument();
    });
    expect(screen.getAllByText('Reloan').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('New')).toHaveLength(1);
  });
});
