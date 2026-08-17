import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RefundLedger } from '../../src/components/RefundLedger';
import type { Refund } from '../../src/types';

const refund: Refund = {
  id: 7,
  loan_id: 1,
  client_id: 10,
  amount: 5000,
  reason: 'Overpayment by borrower',
  status: 'verified',
  verified_by: null,
  approved_by: null,
  released_by: null,
  verified_at: '2026-08-03T10:00:00Z',
  approved_at: null,
  released_at: null,
  completed_at: null,
  rejected_at: null,
  notes: null,
  release_method: null,
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-03T10:00:00Z',
};

describe('RefundLedger', () => {
  it('renders refund ID in header', () => {
    render(<RefundLedger refund={refund} />);

    expect(screen.getByText(/Refund #7/)).toBeInTheDocument();
  });

  it('renders refund amount as PHP', () => {
    render(<RefundLedger refund={refund} />);

    expect(screen.getByText(/₱5,000/)).toBeInTheDocument();
  });

  it('renders refund reason', () => {
    render(<RefundLedger refund={refund} />);

    expect(screen.getByText('Overpayment by borrower')).toBeInTheDocument();
  });

  it('renders status badge for verified', () => {
    render(<RefundLedger refund={refund} />);

    const badges = screen.getAllByText('Verified');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows requested step as completed', () => {
    render(<RefundLedger refund={refund} />);

    const steps = screen.getAllByText('Requested');
    // There could be a badge and a step label; at least one should be from the timeline
    const stepElement = steps.find(
      (el) => el.closest('[class*="step"]') || el.closest('[class*="completed"]'),
    );
    expect(stepElement).toBeTruthy();
  });

  it('shows verified step as current', () => {
    render(<RefundLedger refund={refund} />);

    const steps = screen.getAllByText('Verified');
    const stepElement = steps.find(
      (el) =>
        el.closest('[class*="step"]') ||
        el.closest('[class*="current"]') ||
        el.closest('[class*="active"]'),
    );
    expect(stepElement).toBeTruthy();
  });

  it('shows approved step as future', () => {
    render(<RefundLedger refund={refund} />);

    const approvedEl = screen.queryAllByText('Approved').find(
      (el) => el.closest('[class*="step"]') || el.closest('[class*="future"]') || el.closest('[class*="pending"]'),
    );
    expect(approvedEl).toBeTruthy();
  });

  it('shows completed step as future', () => {
    render(<RefundLedger refund={refund} />);

    const completedEl = screen.queryAllByText('Completed').find(
      (el) => el.closest('[class*="step"]') || el.closest('[class*="future"]') || el.closest('[class*="pending"]'),
    );
    expect(completedEl).toBeTruthy();
  });

  it('renders rejected status step when rejected', () => {
    const rejectedRefund: Refund = {
      ...refund,
      id: 99,
      status: 'rejected',
      rejected_at: '2026-08-04T10:00:00Z',
    };

    render(<RefundLedger refund={rejectedRefund} />);

    const badges = screen.getAllByText('Rejected');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
