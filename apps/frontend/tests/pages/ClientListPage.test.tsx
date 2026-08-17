import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClientListPage } from '../../src/pages/ClientListPage';

vi.mock('../../src/services/clientService');

import { getClients } from '../../src/services/clientService';

const mockClients = [
  {
    id: 1,
    name: 'Alice Santos',
    address: 'Manila',
    work: 'Teacher',
    contact_number: '09171234567',
    photo_url: null,
    social_media: null,
    notes: null,
    is_active: true,
    loans_count: 2,
    loans_by_status: JSON.stringify({ active: 1, fully_paid: 1 }),
    created_at: '2026-01-01',
    updated_at: '2026-06-01',
    deleted_at: null,
  },
  {
    id: 2,
    name: 'Bob Reyes',
    address: 'Quezon City',
    work: 'Driver',
    contact_number: '09181234567',
    photo_url: null,
    social_media: null,
    notes: null,
    is_active: true,
    loans_count: 1,
    loans_by_status: JSON.stringify({ past_due: 1 }),
    created_at: '2026-02-01',
    updated_at: '2026-06-01',
    deleted_at: null,
  },
  {
    id: 3,
    name: 'Carla Gomez',
    address: 'Makati',
    work: 'Nurse',
    contact_number: null,
    photo_url: null,
    social_media: null,
    notes: null,
    is_active: false,
    loans_count: 0,
    loans_by_status: '{}',
    created_at: '2026-03-01',
    updated_at: '2026-06-01',
    deleted_at: null,
  },
];

const mockPaginatedResponse = {
  data: mockClients,
  meta: { current_page: 1, last_page: 1, per_page: 15, total: 3, from: 1, to: 3 },
  links: { first: null, last: null, prev: null, next: null },
};

describe('ClientListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
  });

  it('renders page heading "Borrowers"', async () => {
    render(
      <MemoryRouter>
        <ClientListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const headings = screen.getAllByText('Borrowers');
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders "Add Borrower" button/link', async () => {
    render(
      <MemoryRouter>
        <ClientListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Add Borrower' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/clients/new');
    });
  });

  it('renders client names in table after loading', async () => {
    render(
      <MemoryRouter>
        <ClientListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Alice Santos' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Bob Reyes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Carla Gomez' })).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    (getClients as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <ClientListPage />
      </MemoryRouter>,
    );

    const spinner = document.querySelector('.spinner-border');
    expect(spinner).toBeInTheDocument();
  });

  it('shows empty state when no clients', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null },
      links: { first: null, last: null, prev: null, next: null },
    });

    render(
      <MemoryRouter>
        <ClientListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No borrowers found')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(
      <MemoryRouter>
        <ClientListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Search by name or contact number...'),
      ).toBeInTheDocument();
    });
  });

  it('renders status filter dropdown', async () => {
    render(
      <MemoryRouter>
        <ClientListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Inactive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
  });
});
