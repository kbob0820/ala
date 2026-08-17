import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { detectOverpayment, createRefund } from '@/services/refundService';
import { getLoan } from '@/services/loanService';
import type { Loan, OverpaymentInfo, Refund } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

const REASON_OPTIONS = [
  'Overpayment by borrower',
  'Payment error',
  'Loan adjustment',
  'Duplicate payment',
  'Other',
];

export function RefundRequestPage() {
  const { loanId } = useParams<{ loanId: string }>();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [overpaymentInfo, setOverpaymentInfo] = useState<OverpaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Refund | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const id = Number(loanId);

  useEffect(() => {
    if (!loanId || Number.isNaN(id)) {
      setError('Invalid loan ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([getLoan(id), detectOverpayment(id)])
      .then(([loanData, overpaymentData]) => {
        setLoan(loanData);
        setOverpaymentInfo(overpaymentData);
        if (!overpaymentData) {
          setError('No overpayment detected for this loan');
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load loan or overpayment data';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loanId, id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overpaymentInfo) return;

    setSubmitting(true);
    setSubmitError(null);

    createRefund({
      loan_id: id,
      amount: overpaymentInfo.overpayment,
      reason,
      notes: notes || undefined,
    })
      .then((refund) => {
        setSuccess(refund);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to submit refund request';
        setSubmitError(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-4">Refund Request</h1>
        <div className="alert alert-danger">{error}</div>
        <Link to="/refunds" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" />
          Back to Refunds
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <h1 className="mb-4">Refund Request</h1>
        <div className="alert alert-success">
          <i className="fa-solid fa-circle-check me-2" />
          Refund request #{success.id} created successfully. Awaiting verification.
        </div>
        <div className="d-flex gap-2">
          <Link to={`/refunds/${success.id}`} className="btn btn-primary">
            Track Refund #{success.id}
          </Link>
          <Link to="/refunds" className="btn btn-outline-secondary">
            Back to Refunds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4">Refund Request</h1>

      {submitError && <div className="alert alert-danger">{submitError}</div>}

      {loan && overpaymentInfo && (
        <div className="ala-card mb-4">
          <div className="card-header d-flex align-items-center">
            <h5 className="mb-0">Overpayment Detected</h5>
            <span className="badge bg-warning ms-2">Warning</span>
          </div>
          <div className="card-body">
            <table className="table table-sm mb-0">
              <tbody>
                <tr>
                  <th className="w-25">Borrower</th>
                  <td>
                    {loan.client ? (
                      <Link to={`/clients/${loan.client_id}`}>{loan.client.name}</Link>
                    ) : (
                      `Client #${loan.client_id}`
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Loan #</th>
                  <td>{loan.id}</td>
                </tr>
                <tr>
                  <th>Loan Amount</th>
                  <td>{formatCurrency(loan.amount)}</td>
                </tr>
                <tr>
                  <th>Total Paid</th>
                  <td>{formatCurrency(overpaymentInfo.totalPaid)}</td>
                </tr>
                <tr>
                  <th>Late Fees</th>
                  <td>{formatCurrency(overpaymentInfo.lateFees)}</td>
                </tr>
                <tr className="table-success">
                  <th>Overpayment</th>
                  <td>
                    <span className="fs-5 fw-bold text-success">
                      {formatCurrency(overpaymentInfo.overpayment)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-muted mt-3 mb-0">
              <i className="fa-solid fa-circle-info me-1" />
              This amount is eligible for refund.
            </p>
          </div>
        </div>
      )}

      {overpaymentInfo && (
        <div className="ala-card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Refund Request</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Refund Amount (PHP)</label>
                <input
                  type="number"
                  className="form-control"
                  value={overpaymentInfo.overpayment}
                  readOnly
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Reason <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                >
                  <option value="">Select reason...</option>
                  {REASON_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Additional details for the refund request"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !reason}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
                <Link to="/refunds" className="btn btn-outline-secondary">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .ala-card {
          background: var(--ala-white);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-lg);
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
