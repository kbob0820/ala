import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BorrowerLookup } from '../../src/components/BorrowerLookup';

vi.mock('../../src/services/clientService');

import { getClients } from '../../src/services/clientService';

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
  loans_by_status: '{}',
};

const mockPaginatedResponse = {
  data: [mockClient],
  links: { first: null, last: null, prev: null, next: null },
  meta: { current_page: 1, from: 1, last_page: 1, per_page: 8, to: 1, total: 1 },
};

function renderLookup(onChange = vi.fn()) {
  return render(<BorrowerLookup onChange={onChange} />);
}

describe('BorrowerLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', () => {
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    expect(input).toBeInTheDocument();
  });

  it('renders Borrower label', () => {
    renderLookup();

    expect(screen.getByLabelText('Borrower')).toBeInTheDocument();
  });

  it('searches clients on input with debounce', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(getClients).toHaveBeenCalledWith({
        search: 'Test',
        per_page: 8,
        status: 'active',
      });
    });
  });

  it('shows results dropdown with client names', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    expect(option).toBeInTheDocument();
  });

  it('shows contact number in results when available', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const contact = await screen.findByText('09123456789');
    expect(contact).toBeInTheDocument();
  });

  it('calls onChange with client id on selection', async () => {
    const onChange = vi.fn();
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup(onChange);

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('shows selected borrower name in input after selection', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    expect(input).toHaveDisplayValue('Test Borrower');
  });

  it('shows clear button after selection', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    expect(screen.getByLabelText('Clear borrower selection')).toBeInTheDocument();
  });

  it('clears selection when clear button clicked', async () => {
    const onChange = vi.fn();
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup(onChange);

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    const clearButton = screen.getByLabelText('Clear borrower selection');
    await userEvent.click(clearButton);

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input).toHaveDisplayValue('');
  });

  it('shows no results message when no clients found', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPaginatedResponse,
      data: [],
    });
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Nonexistent');

    vi.advanceTimersByTime(300);

    const message = await screen.findByText('No borrowers found');
    expect(message).toBeInTheDocument();
  });

  it('filters out inactive clients from results', async () => {
    const inactiveClient = { ...mockClient, id: 99, name: 'Inactive Borrower', is_active: false };
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPaginatedResponse,
      data: [mockClient, inactiveClient],
    });
    renderLookup();

    const input = screen.getByPlaceholderText('Search borrower by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const activeOption = await screen.findByText('Test Borrower');
    expect(activeOption).toBeInTheDocument();
    expect(screen.queryByText('Inactive Borrower')).toBeNull();
  });
});
