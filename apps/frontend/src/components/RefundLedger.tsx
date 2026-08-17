import type { Refund, RefundStatus } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

interface Milestone {
  label: string;
  status: 'completed' | 'current' | 'future' | 'error';
  date: string | null;
  description: string;
}

const STATUS_ORDER: RefundStatus[] = ['requested', 'verified', 'approved', 'released', 'completed'];

function getStepStatus(step: RefundStatus, currentStatus: RefundStatus): 'completed' | 'current' | 'future' {
  const stepIdx = STATUS_ORDER.indexOf(step);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (currentStatus === 'rejected') return 'future';
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'current';
  return 'future';
}

function buildTimeline(refund: Refund): Milestone[] {
  const milestones: Milestone[] = [
    {
      label: 'Requested',
      status: getStepStatus('requested', refund.status),
      date: refund.created_at,
      description: 'Refund request created',
    },
    {
      label: 'Verified',
      status: getStepStatus('verified', refund.status),
      date: refund.verified_at,
      description: 'Overpayment verified',
    },
    {
      label: 'Approved',
      status: getStepStatus('approved', refund.status),
      date: refund.approved_at,
      description: 'Refund approved for release',
    },
    {
      label: 'Released',
      status: getStepStatus('released', refund.status),
      date: refund.released_at,
      description: `Funds released${refund.release_method ? ` via ${refund.release_method}` : ''}`,
    },
    {
      label: 'Completed',
      status: getStepStatus('completed', refund.status),
      date: refund.completed_at,
      description: 'Refund fully processed',
    },
  ];

  if (refund.status === 'rejected') {
    milestones.push({
      label: 'Rejected',
      status: 'error',
      date: refund.rejected_at,
      description: refund.notes ?? 'Refund request rejected',
    });
  }

  return milestones;
}

const STATUS_ICONS: Record<string, string> = {
  completed: 'fa-solid fa-circle-check text-success',
  current: 'fa-solid fa-circle text-primary',
  future: 'fa-regular fa-circle text-muted',
  error: 'fa-solid fa-circle-xmark text-danger',
};

const STATUS_CLASSES: Record<string, string> = {
  completed: 'step-completed',
  current: 'step-current',
  future: 'step-future',
  error: 'step-error',
};

interface RefundLedgerProps {
  refund: Refund;
}

export function RefundLedger({ refund }: RefundLedgerProps) {
  const milestones = buildTimeline(refund);

  return (
    <>
      <h5 className="mb-3">Refund #{refund.id}</h5>
      <div className="row g-4">
        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fa-solid fa-timeline me-2" />
                Status Timeline
              </h6>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {milestones.map((m, i) => (
                  <li
                    key={i}
                    className={`list-group-item border-0 ps-0 pb-0 ${STATUS_CLASSES[m.status] ?? ''}`}
                  >
                    <div className="d-flex">
                      <div className="me-3 d-flex flex-column align-items-center" style={{ minWidth: 24 }}>
                        <i className={STATUS_ICONS[m.status] ?? 'fa-regular fa-circle'} style={{ fontSize: '1.1rem' }} />
                        {i < milestones.length - 1 && (
                          <div
                            className="flex-grow-1"
                            style={{
                              width: 2,
                              backgroundColor: m.status === 'completed' ? '#198754' : '#dee2e6',
                              minHeight: 32,
                            }}
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
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fa-solid fa-circle-info me-2" />
                Refund Details
              </h6>
            </div>
            <div className="card-body p-0">
              <table className="table table-striped mb-0">
                <tbody>
                  <tr>
                    <th className="ps-3" style={{ width: '30%' }}>Amount</th>
                    <td className="fw-bold">{formatCurrency(refund.amount)}</td>
                  </tr>
                  <tr>
                    <th className="ps-3">Reason</th>
                    <td>{refund.reason || '—'}</td>
                  </tr>
                  <tr>
                    <th className="ps-3">Status</th>
                    <td><StatusBadge status={refund.status} /></td>
                  </tr>
                  <tr>
                    <th className="ps-3">Release Method</th>
                    <td>{refund.release_method || '—'}</td>
                  </tr>
                  <tr>
                    <th className="ps-3">Notes</th>
                    <td>{refund.notes || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
