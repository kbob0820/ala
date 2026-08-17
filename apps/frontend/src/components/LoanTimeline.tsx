import { useState } from 'react';
import type { Loan } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

interface Milestone {
  label: string;
  status: 'completed' | 'current' | 'future' | 'error';
  date: string | null;
  description: string;
}

function buildTimeline(loan: Loan): Milestone[] {
  const milestones: Milestone[] = [
    {
      label: 'Created',
      status: 'completed',
      date: loan.created_at,
      description: `Loan application created` + (loan.created_by_user ? ` by ${loan.created_by_user.name}` : ''),
    },
  ];

  if (loan.application_status === 'submitted') {
    milestones.push({ label: 'Submitted', status: 'completed', date: loan.updated_at, description: 'Submitted for review' });
    milestones.push({ label: 'Under Review', status: 'current', date: null, description: 'Awaiting approver review' });
    milestones.push({ label: 'Approved', status: 'future', date: null, description: 'Application approval' });
    milestones.push({ label: 'Released', status: 'future', date: null, description: 'Funds disbursed to borrower' });
    milestones.push({ label: 'Completed', status: 'future', date: null, description: 'Loan fully paid' });
  } else if (loan.application_status === 'under_review' || loan.application_status === 'pending_documents') {
    milestones.push({ label: 'Submitted', status: 'completed', date: loan.updated_at, description: 'Submitted for review' });
    milestones.push({ label: 'Under Review', status: 'current', date: null, description: loan.application_status === 'pending_documents' ? 'Awaiting documents' : 'Active review' });
    milestones.push({ label: 'Approved', status: 'future', date: null, description: 'Application approval' });
    milestones.push({ label: 'Released', status: 'future', date: null, description: 'Funds disbursed' });
    milestones.push({ label: 'Completed', status: 'future', date: null, description: 'Loan fully paid' });
  } else if (loan.loan_status === 'waiting_for_release') {
    milestones.push({ label: 'Submitted', status: 'completed', date: null, description: 'Application submitted' });
    milestones.push({ label: 'Approved', status: 'completed', date: loan.approved_at, description: `Approved${loan.approved_by_user ? ` by ${loan.approved_by_user.name}` : ''}` });
    milestones.push({ label: 'Release', status: 'current', date: null, description: 'Awaiting cashier release' });
  } else if (loan.loan_status === 'active') {
    milestones.push({ label: 'Submitted', status: 'completed', date: null, description: 'Application submitted' });
    milestones.push({ label: 'Approved', status: 'completed', date: loan.approved_at, description: `Approved${loan.approved_by_user ? ` by ${loan.approved_by_user.name}` : ''}` });
    milestones.push({ label: 'Released', status: 'completed', date: loan.released_at, description: `Released on ${formatDate(loan.released_at)}` });
    milestones.push({ label: 'Active', status: 'current', date: null, description: 'In repayment' });
    milestones.push({ label: 'Completed', status: 'future', date: null, description: 'Loan fully paid' });
  } else if (loan.loan_status === 'past_due' || loan.loan_status === 'delinquent') {
    milestones.push({ label: 'Submitted', status: 'completed', date: null, description: 'Application submitted' });
    milestones.push({ label: 'Approved', status: 'completed', date: loan.approved_at, description: `Approved` });
    milestones.push({ label: 'Released', status: 'completed', date: loan.released_at, description: `Released on ${formatDate(loan.released_at)}` });
    milestones.push({ label: 'Overdue', status: 'error', date: null, description: 'Has overdue installments' });
  } else if (loan.loan_status === 'fully_paid' || loan.loan_status === 'closed' || loan.loan_status === 'settled_by_reloan') {
    milestones.push({ label: 'Submitted', status: 'completed', date: null, description: 'Application submitted' });
    milestones.push({ label: 'Approved', status: 'completed', date: loan.approved_at, description: `Approved` });
    milestones.push({ label: 'Released', status: 'completed', date: loan.released_at, description: `Released` });
    milestones.push({ label: 'Active', status: 'completed', date: null, description: 'In repayment' });
    milestones.push({
      label: loan.loan_status === 'settled_by_reloan' ? 'Settled by Reloan' : 'Completed',
      status: 'completed',
      date: loan.closed_at,
      description: loan.loan_status === 'settled_by_reloan'
        ? `Settled by reloan on ${formatDate(loan.closed_at)}`
        : `Fully paid on ${formatDate(loan.closed_at)}`,
    });
  } else if (loan.application_status === 'rejected') {
    milestones.push({ label: 'Submitted', status: 'completed', date: null, description: 'Application submitted' });
    milestones.push({ label: 'Rejected', status: 'error', date: loan.updated_at, description: 'Application rejected' });
  } else if (loan.application_status === 'cancelled') {
    milestones.push({ label: 'Created', status: 'completed', date: loan.created_at, description: 'Application created' });
    milestones.push({ label: 'Cancelled', status: 'error', date: loan.updated_at, description: 'Application cancelled' });
  } else if (loan.loan_status === 'defaulted') {
    milestones.push({ label: 'Submitted', status: 'completed', date: null, description: 'Application submitted' });
    milestones.push({ label: 'Approved', status: 'completed', date: loan.approved_at, description: `Approved` });
    milestones.push({ label: 'Released', status: 'completed', date: loan.released_at, description: `Released` });
    milestones.push({ label: 'Defaulted', status: 'error', date: null, description: '90+ days overdue' });
  } else if (loan.application_status === 'approved') {
    milestones.push({ label: 'Submitted', status: 'completed', date: null, description: 'Application submitted' });
    milestones.push({ label: 'Approved', status: 'completed', date: loan.approved_at, description: `Approved${loan.approved_by_user ? ` by ${loan.approved_by_user.name}` : ''}` });
    milestones.push({ label: 'Released', status: 'current', date: null, description: 'Awaiting cashier release' });
    milestones.push({ label: 'Completed', status: 'future', date: null, description: 'Loan fully paid' });
  }

  return milestones;
}

const STATUS_ICONS: Record<string, string> = {
  completed: 'fa-solid fa-circle-check text-success',
  current: 'fa-solid fa-circle text-primary',
  future: 'fa-regular fa-circle text-muted',
  error: 'fa-solid fa-circle-xmark text-danger',
};

export function LoanTimeline({ loan }: { loan: Loan }) {
  const [expanded, setExpanded] = useState(false);
  const milestones = buildTimeline(loan);
  const displayMilestones = expanded ? milestones : milestones.filter((m) => m.status !== 'future');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">
          <i className="fa-solid fa-timeline me-2" />
          Status Timeline
        </h6>
        <div>
          <StatusBadge status={loan.loan_status ?? loan.application_status} />
        </div>
      </div>
      <ul className="list-group list-group-flush">
        {displayMilestones.map((m, i) => (
          <li key={i} className="list-group-item border-0 ps-0 pb-0">
            <div className="d-flex">
              <div className="me-3 d-flex flex-column align-items-center" style={{ minWidth: 24 }}>
                <i className={STATUS_ICONS[m.status] ?? 'fa-regular fa-circle'} style={{ fontSize: '1.1rem' }} />
                {i < displayMilestones.length - 1 && (
                  <div
                    className="flex-grow-1"
                    style={{ width: 2, backgroundColor: m.status === 'completed' ? '#198754' : '#dee2e6', minHeight: 32 }}
                  />
                )}
              </div>
              <div className="pb-3">
                <div className="fw-medium">{m.label}</div>
                <small className="text-muted">{m.description}</small>
                {m.date && (
                  <div>
                    <small className="text-muted">
                      <i className="fa-regular fa-clock me-1" />
                      {formatDate(m.date)}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {milestones.some((m) => m.status === 'future') && (
        <button
          className="btn btn-link btn-sm p-0 mt-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show all (${milestones.length} steps)`}
        </button>
      )}
    </div>
  );
}
