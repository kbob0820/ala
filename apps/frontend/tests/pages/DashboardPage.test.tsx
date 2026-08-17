import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/dashboardService');
vi.mock('../../src/services/loanService');
vi.mock('../../src/components/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));
vi.mock('../../src/components/CollectionChart', () => ({
  default: () => <div>Chart</div>,
}));

import DashboardPage from '../../src/pages/DashboardPage';
import { useAuth } from '../../src/hooks/useAuth';
import { getDashboard } from '../../src/services/dashboardService';
import { getLoans } from '../../src/services/loanService';

const mockDashboard = {
  summary: {
    total_clients: 150,
    active_loans: 85,
    pending_applications: 12,
    completed_loans: 340,
    defaulted_loans: 3,
    total_collections: 1250000,
    total_expected_repayments: 850000,
    due_installments: 25,
    overdue_installments: 8,
    total_late_fees: 12500,
  },
  recent_loans: [
    {
      id: 1,
      client_id: 10,
      client: { id: 10, name: 'Test Client' },
      amount: 10000,
      loan_status: 'active',
      application_status: 'approved',
      created_at: '2026-08-01T10:00:00Z',
    },
  ],
  upcoming_due: [
    {
      installment_id: 1,
      loan_id: 1,
      client_name: 'Test Client',
      installment_number: 3,
      due_date: '2026-08-15',
      amount: 1666.67,
    },
  ],
};

function renderWithRole(roleSlug: string) {
  const roleNames: Record<string, string> = {
    administrator: 'Administrator',
    loan_officer: 'Loan Officer',
    approver: 'Approver',
    cashier: 'Cashier',
    collector: 'Collector',
    auditor: 'Auditor',
    borrower: 'Borrower',
  };
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: { id: 1, name: roleNames[roleSlug] ?? roleSlug, slug: roleSlug, description: null, created_at: '', updated_at: '' },
      role_id: 1,
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue(mockDashboard);
    (getLoans as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], meta: { last_page: 1 } });
  });

  it('renders loading spinner initially', () => {
    (getDashboard as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    renderWithRole('administrator');

    const spinner = document.querySelector('.spinner-border');
    expect(spinner).toBeInTheDocument();
  });

  it('renders administrator dashboard with all KPIs', async () => {
    renderWithRole('administrator');

    await waitFor(() => {
      expect(screen.getByText('Active Loans')).toBeInTheDocument();
    });
  });

  it('administrator shows "Active Loans" KPI', async () => {
    renderWithRole('administrator');

    await waitFor(() => {
      expect(screen.getByText('Active Loans')).toBeInTheDocument();
    });
  });

  it('administrator shows "Total Collections" KPI', async () => {
    renderWithRole('administrator');

    await waitFor(() => {
      expect(screen.getByText('Total Collections')).toBeInTheDocument();
    });
  });

  it('administrator shows "Pending Approval" KPI', async () => {
    renderWithRole('administrator');

    await waitFor(() => {
      const elements = screen.getAllByText('Pending Approval');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('administrator shows user name in greeting', async () => {
    renderWithRole('administrator');

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Test User/)).toBeInTheDocument();
    });
  });

  it('loan_officer shows "My Clients" KPI', async () => {
    renderWithRole('loan_officer');

    await waitFor(() => {
      expect(screen.getByText('My Clients')).toBeInTheDocument();
    });
  });

  it('loan_officer shows "Register Borrower" quick action', async () => {
    renderWithRole('loan_officer');

    await waitFor(() => {
      expect(screen.getByText('Register Borrower')).toBeInTheDocument();
    });
  });

  it('cashier shows "Total Collected" KPI', async () => {
    renderWithRole('cashier');

    await waitFor(() => {
      expect(screen.getByText('Total Collected')).toBeInTheDocument();
    });
  });

  it('cashier shows "Record Payment" quick action', async () => {
    renderWithRole('cashier');

    await waitFor(() => {
      expect(screen.getByText('Record Payment')).toBeInTheDocument();
    });
  });

  it('collector shows "Overdue" KPI', async () => {
    renderWithRole('collector');

    await waitFor(() => {
      const elements = screen.getAllByText('Overdue');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('collector shows "View Past Due Loans" quick action', async () => {
    renderWithRole('collector');

    await waitFor(() => {
      expect(screen.getByText('View Past Due Loans')).toBeInTheDocument();
    });
  });

  it('auditor shows "Auditor" badge text', async () => {
    renderWithRole('auditor');

    await waitFor(() => {
      expect(screen.getByText('Auditor')).toBeInTheDocument();
    });
  });

  it('borrower shows "My Loans" quick action', async () => {
    renderWithRole('borrower');

    await waitFor(() => {
      expect(screen.getByText('My Loans')).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    (getDashboard as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    renderWithRole('administrator');

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders recent loans table', async () => {
    renderWithRole('administrator');

    await waitFor(() => {
      expect(screen.getByText('Recent Loans')).toBeInTheDocument();
    });
  });

  it('renders upcoming due table', async () => {
    renderWithRole('administrator');

    await waitFor(() => {
      expect(screen.getByText('Due This Week')).toBeInTheDocument();
    });
  });
});
