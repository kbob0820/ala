import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentSummary, recordPayment, type PaymentSummary } from '@/services/paymentService';
import type { Payment } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getMethodBadge(method: string): string {
  const m = method.toLowerCase();
  if (m === 'cash') return 'secondary';
  if (m === 'gcash') return 'info';
  if (m === 'bpi') return 'primary';
  if (m === 'bdo') return 'success';
  return 'warning';
}

export function ReceivePaymentPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const loanIdNum = Number(loanId);

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loanIdNum || isNaN(loanIdNum)) {
      setError('Invalid loan ID');
      setLoading(false);
      return;
    }

    getPaymentSummary(loanIdNum)
      .then((result) => {
        setSummary(result);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load payment summary';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loanIdNum]);

  function resetForm() {
    setAmount('');
    setPaymentMethod('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setProofFile(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }
    if (!paymentDate) {
      setError('Please select a payment date.');
      return;
    }
    if (paymentMethod.toLowerCase() !== 'cash' && !proofFile) {
      setError('Proof of payment is recommended for non-cash payments.');
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('amount', String(parsedAmount));
      formData.append('payment_method', paymentMethod);
      formData.append('payment_date', paymentDate);
      if (notes) {
        formData.append('notes', notes);
      }
      if (proofFile) {
        formData.append('proof_image', proofFile);
      }

      await recordPayment(loanIdNum, formData);

      const updatedSummary = await getPaymentSummary(loanIdNum);
      setSummary(updatedSummary);

      setSuccess(`Payment of ${formatCurrency(parsedAmount)} recorded successfully.`);
      resetForm();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to record payment';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Receive Payment</h1>
        <Link to="/payments" className="btn btn-outline-secondary">
          Back to Payments
        </Link>
      </div>

      {success && (
        <div className="alert alert-success">
          {success}{' '}
          <Link to="/payments" className="alert-link">
            Back to Payments
          </Link>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {summary && (
        <div className="ala-card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Loan Summary</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <small className="text-muted">Borrower</small>
                <div className="fw-bold">{summary.loan.client?.name ?? `Client #${summary.loan.client_id}`}</div>
              </div>
              <div className="col-md-3">
                <small className="text-muted">Loan #</small>
                <div className="fw-bold">{summary.loan.id}</div>
              </div>
              <div className="col-md-3">
                <small className="text-muted">Gross Amount</small>
                <div className="fw-bold">{formatCurrency(summary.loan.amount)}</div>
              </div>
              <div className="col-md-3">
                <small className="text-muted">Total Paid</small>
                <div className="fw-bold text-success">{formatCurrency(summary.totalPaid)}</div>
              </div>
            </div>
            <hr />
            <div className="row align-items-center">
              <div className="col-md-6">
                <div className={summary.remainingBalance > 0 ? 'text-danger' : ''}>
                  <small className="text-muted">Remaining Balance</small>
                  <div className="fs-3 fw-bold">{formatCurrency(summary.remainingBalance)}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="progress" style={{ height: 24 }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-label="Payment progress"
                    style={{
                      width: `${summary.loan.amount > 0 ? Math.min(100, Math.round((summary.totalPaid / summary.loan.amount) * 100)) : 0}%`,
                    }}
                  >
                    {summary.loan.amount > 0
                      ? Math.min(100, Math.round((summary.totalPaid / summary.loan.amount) * 100))
                      : 0}
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        <div className="col-md-6">
          <div className="ala-card">
            <div className="card-header">
              <h5 className="mb-0">Record Payment</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                  >
                    <option value="">Select method...</option>
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="BPI">BPI</option>
                    <option value="BDO">BDO</option>
                    <option value="Other Banks">Other Banks</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input
                      type="number"
                      className="form-control"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Proof of Payment</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="form-text">Required for non-cash payments</div>
                </div>

                <button
                  type="submit"
                  className="btn btn-success w-100"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Recording...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="ala-card">
            <div className="card-header">
              <h5 className="mb-0">Payment History</h5>
            </div>
            <div className="card-body p-0">
              {summary && summary.payments.length === 0 ? (
                <div className="text-center py-4 text-muted">No payments recorded yet</div>
              ) : summary ? (
                <div className="table-responsive">
                  <table className="table table-striped table-hover mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Amount (PHP)</th>
                        <th>Proof</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.payments
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.payment_date).getTime() -
                            new Date(a.payment_date).getTime(),
                        )
                        .map((payment: Payment, idx: number) => (
                          <tr key={payment.id}>
                            <td>{idx + 1}</td>
                            <td>{formatDate(payment.payment_date)}</td>
                            <td>
                              <span className={`badge bg-${getMethodBadge(payment.payment_method)}`}>
                                {payment.payment_method}
                              </span>
                            </td>
                            <td>{formatCurrency(payment.amount)}</td>
                            <td>
                              {payment.proof_image ? (
                                <a
                                  href={payment.proof_image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                              ) : (
                                'No proof'
                              )}
                            </td>
                            <td>{payment.notes || '—'}</td>
                            <td>
                              <Link
                                to={`/payments/receipt/${loanIdNum}/${payment.id}`}
                                className="btn btn-outline-secondary btn-sm"
                              >
                                View Receipt
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
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
