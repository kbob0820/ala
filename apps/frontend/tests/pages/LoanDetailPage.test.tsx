import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/loanService');
vi.mock('../../src/services/paymentService');
vi.mock('../../src/services/paymentTypeService');

import { LoanDetailPage } from '../../src/pages/LoanDetailPage';
import { useAuth } from '../../src/hooks/useAuth';
import { getLoan } from '../../src/services/loanService';
import type { Loan } from '../../src/types';

const mockUser = {
  id: 1,
  name: 'Officer John',
  email: 'john@test.com',
  role: { id: 1, name: 'Administrator', slug: 'administrator', description: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
  role_id: 1,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

function createLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 5,
    client_id: 1,
    parent_loan_id: null,
    loan_type: 'regular',
    loan_number: 'LN-2026-00005',
    created_by: 1,
    approved_by: 2,
    term_months: 3,
    interest_rate_per_month: 10,
    charges: 0,
    charges_description: null,
    old_balance_settlement: 0,
    total_deductions: 0,
    guarantor: null,
    first_payment_due_date: '2026-08-15',
    application_status: 'approved',
    loan_status: 'settled_by_reloan',
    collection_status: null,
    amount: 10000,
    total_interest: 3000,
    net_proceeds: 7000,
    installment_amount: 1666.67,
    total_installments: 6,
    approved_at: '2026-08-02T10:00:00Z',
    released_at: '2026-08-03T10:00:00Z',
    closed_at: '2026-08-05T10:00:00Z',
    remaining_balance: 0,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
    deleted_at: null,
    client: { id: 1, name: 'Alice Santos', address: null, work: null, work_address: null, contact_number: null, social_media: null, notes: null, photo: null, photo_url: null, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null },
    installments: [],
    payments: [],
    release_sources: [],
    created_by_user: mockUser,
    approved_by_user: mockUser,
    documents: [],
    ...overrides,
  };
}

function renderLoanDetail() {
  return render(
    <MemoryRouter initialEntries={['/loans/5']}>
      <Routes>
        <Route path="/loans/:id" element={<LoanDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoanDetailPage — settled_by_reloan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('shows which reloan settled the old loan', async () => {
    const loan = createLoan({
      loan_status: 'settled_by_reloan',
      release_sources: [
        {
          id: 1,
          loan_id: 5,
          release_method: 'Cash',
          amount: 7000,
          fee: 0,
          proof_image: null,
          proof_image_url: null,
          notes: null,
          release_date: '2026-08-03',
          created_at: '2026-08-03T10:00:00Z',
          updated_at: '2026-08-03T10:00:00Z',
        },
      ],
      settlements_as_old_loan: [
        {
          id: 10,
          reloan_loan_id: 99,
          old_loan_id: 5,
          settlement_amount: 8000,
          settlement_date: '2026-08-05',
          status: 'completed',
          payment_id: null,
          created_by: 1,
          approved_by: null,
          deleted_at: null,
          created_at: '2026-08-05T10:00:00Z',
          updated_at: '2026-08-05T10:00:00Z',
          reloan_loan: { ...createLoan({ id: 99, loan_type: 'reloan', loan_status: 'active' }), parent_loan_id: 5 },
        },
      ],
    });
    vi.mocked(getLoan).mockResolvedValue(loan);

    renderLoanDetail();

    await waitFor(() => expect(screen.getByText('Status Timeline')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Payments' }));

    expect(screen.getByText('Settled By Reloan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Loan #99' })).toBeInTheDocument();
    expect(screen.getByText(/8,000\.00/)).toBeInTheDocument();
  });

  it('does not render the reloan section for a non-settled loan', async () => {
    const loan = createLoan({ loan_status: 'active' });
    vi.mocked(getLoan).mockResolvedValue(loan);

    renderLoanDetail();

    await waitFor(() => expect(screen.getByText('Status Timeline')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(screen.queryByText('Settled By Reloan')).not.toBeInTheDocument();
  });
});
