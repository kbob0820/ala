import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentSummary } from '@/services/paymentService';
import type { Payment } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function paymentMethodIcon(method: string): string {
  const m = method.toLowerCase();
  if (m.includes('gcash')) return 'GCash';
  if (m.includes('maya') || m.includes('paymaya')) return 'Maya';
  if (m.includes('bank') || m.includes('transfer')) return 'Bank Transfer';
  if (m.includes('cash')) return 'Cash';
  return method;
}

export function PaymentReceiptPage() {
  const { loanId, paymentId } = useParams<{ loanId: string; paymentId: string }>();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [borrowerName, setBorrowerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summary = await getPaymentSummary(Number(loanId));
      const found = summary.payments.find((p) => p.id === Number(paymentId));

      if (!found) {
        setError('Payment not found');
        setLoading(false);
        return;
      }

      setPayment(found);
      setTotalPaid(summary.totalPaid);
      setLoanAmount(summary.loan.amount);
      setBorrowerName(summary.loan.client?.name ?? `Client #${summary.loan.client_id}`);
      setContactNumber(summary.loan.client?.contact_number ?? '—');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load receipt',
      );
    } finally {
      setLoading(false);
    }
  }, [loanId, paymentId]);

  useEffect(() => {
    if (loanId && paymentId) {
      fetchReceipt();
    }
  }, [fetchReceipt, loanId, paymentId]);

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
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!payment) {
    return <div className="alert alert-warning">Payment not found</div>;
  }

  const receiptNumber = `PAY-${String(payment.id).padStart(5, '0')}`;
  const remainingBalance = Math.max(0, loanAmount - totalPaid);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
        <Link to={`/loans/${loanId}`} className="btn btn-outline-secondary">
          Back to Loan
        </Link>
        <button
          className="btn btn-outline-primary"
          onClick={() => window.print()}
        >
          Print Receipt
        </button>
      </div>

      <div className="ala-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-body p-4">
          <div className="text-center mb-3">
            <h4 className="mb-1">AJang Loan App</h4>
            <h5 className="fw-bold">OFFICIAL RECEIPT</h5>
          </div>

          <div className="row mb-3">
            <div className="col-6">
              <strong>Receipt #:</strong> {receiptNumber}
            </div>
            <div className="col-6 text-end">
              <strong>Date:</strong> {formatDate(payment.payment_date)}
            </div>
          </div>

          <hr />

          <table className="table table-sm mb-4">
            <tbody>
              <tr>
                <td className="text-muted" style={{ width: '150px' }}>Borrower:</td>
                <td><strong>{borrowerName}</strong></td>
              </tr>
              <tr>
                <td className="text-muted">Loan ID:</td>
                <td>#{loanId}</td>
              </tr>
              <tr>
                <td className="text-muted">Contact:</td>
                <td>{contactNumber}</td>
              </tr>
            </tbody>
          </table>

          <table className="table table-bordered mb-4">
            <tbody>
              <tr>
                <td className="text-muted">Amount Received</td>
                <td className="text-end">
                  <span className="fs-4 fw-bold">{formatCurrency(payment.amount)}</span>
                </td>
              </tr>
              <tr>
                <td className="text-muted">Payment Method</td>
                <td className="text-end">{paymentMethodIcon(payment.payment_method)}</td>
              </tr>
              <tr>
                <td className="text-muted">Payment Date</td>
                <td className="text-end">{formatDate(payment.payment_date)}</td>
              </tr>
              <tr>
                <td className="text-muted">Notes</td>
                <td className="text-end">{payment.notes || '—'}</td>
              </tr>
            </tbody>
          </table>

          <div className="ala-card mb-4">
            <div className="card-body">
              <h6 className="mb-3">Loan Status</h6>
              <table className="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td>Total Loan</td>
                    <td className="text-end">{formatCurrency(loanAmount)}</td>
                  </tr>
                  <tr>
                    <td>Total Paid</td>
                    <td className="text-end">{formatCurrency(totalPaid)}</td>
                  </tr>
                  <tr>
                    <td><strong>Remaining Balance</strong></td>
                    <td className={`text-end fw-bold ${remainingBalance > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatCurrency(remainingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center text-muted small">
            This is a computer-generated receipt.
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
