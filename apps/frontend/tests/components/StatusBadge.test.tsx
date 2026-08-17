import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../../src/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders active status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders defaulted status', () => {
    render(<StatusBadge status="defaulted" />);
    expect(screen.getByText('Defaulted')).toBeInTheDocument();
  });

  it('renders past_due status', () => {
    render(<StatusBadge status="past_due" />);
    expect(screen.getByText('Past Due')).toBeInTheDocument();
  });

  it('renders unknown status as-is', () => {
    render(<StatusBadge status="custom_status" />);
    expect(screen.getByText('custom_status')).toBeInTheDocument();
  });

  it('renders paid status', () => {
    render(<StatusBadge status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders reminder_sent status', () => {
    render(<StatusBadge status="reminder_sent" />);
    expect(screen.getByText('Reminder Sent')).toBeInTheDocument();
  });
});
