import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuarantorLookup } from '../../src/components/GuarantorLookup';

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

function renderLookup(props: Partial<Parameters<typeof GuarantorLookup>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const utils = render(
    <GuarantorLookup
      onChange={onChange}
      excludeClientId={props.excludeClientId}
      preselectedName={props.preselectedName}
    />,
  );
  return { ...utils, onChange };
}

describe('GuarantorLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', () => {
    renderLookup();
    expect(screen.getByPlaceholderText('Search guarantor by name...')).toBeInTheDocument();
  });

  it('renders Guarantor label', () => {
    renderLookup();
    expect(screen.getByLabelText('Guarantor')).toBeInTheDocument();
  });

  it('calls onChange with client name on selection', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    const { onChange } = renderLookup();

    const input = screen.getByPlaceholderText('Search guarantor by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('Test Borrower');
  });

  it('shows selected name in input after selection', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    renderLookup();

    const input = screen.getByPlaceholderText('Search guarantor by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    expect(input).toHaveDisplayValue('Test Borrower');
  });

  it('clears selection and emits empty string on clear', async () => {
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaginatedResponse);
    const { onChange } = renderLookup();

    const input = screen.getByPlaceholderText('Search guarantor by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    const option = await screen.findByText('Test Borrower');
    await userEvent.click(option);

    const clearButton = screen.getByLabelText('Clear guarantor selection');
    await userEvent.click(clearButton);

    expect(onChange).toHaveBeenLastCalledWith('');
    expect(input).toHaveDisplayValue('');
  });

  it('excludes the borrower from results', async () => {
    const excluded = { ...mockClient, id: 1, name: 'Primary Borrower' };
    (getClients as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPaginatedResponse,
      data: [mockClient, excluded],
    });
    renderLookup({ excludeClientId: 1 });

    const input = screen.getByPlaceholderText('Search guarantor by name...');
    await userEvent.type(input, 'Test');

    vi.advanceTimersByTime(300);

    await screen.findByText('Test Borrower');
    expect(screen.queryByText('Primary Borrower')).toBeNull();
  });

  it('prefills with preselected name', () => {
    renderLookup({ preselectedName: 'Juan Dela Cruz' });

    expect(screen.getByDisplayValue('Juan Dela Cruz')).toBeInTheDocument();
  });
});
