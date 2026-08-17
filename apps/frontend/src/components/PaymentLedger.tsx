import { computePaymentLedger } from '@/services/paymentService';
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

export interface PaymentLedgerProps {
  payments: Payment[];
  loanAmount: number;
  borrowerName: string;
}

export function PaymentLedger({ payments, loanAmount, borrowerName }: PaymentLedgerProps) {
  const ledger = computePaymentLedger(payments, loanAmount);

  const finalBalance = ledger.length > 0
    ? ledger[ledger.length - 1].runningBalance
    : loanAmount;

  if (payments.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">{borrowerName}</span>
            <span className="badge bg-secondary">{formatCurrency(loanAmount)}</span>
          </div>
        </div>
        <div className="card-body">
          <div className="text-center py-3 text-muted">
            No payment transactions
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">{borrowerName}</span>
          <span className="badge bg-secondary">{formatCurrency(loanAmount)}</span>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Description</th>
                <th className="text-end">Amount (PHP)</th>
                <th className="text-end">Balance (PHP)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-light">
                <td></td>
                <td></td>
                <td>Opening Balance</td>
                <td></td>
                <td className="text-end fw-bold">{formatCurrency(loanAmount)}</td>
              </tr>
              {ledger.map((entry, idx) => (
                <tr key={entry.payment.id}>
                  <td>{idx + 1}</td>
                  <td>{formatDate(entry.payment.payment_date)}</td>
                  <td>
                    <span>Payment — {entry.payment.payment_method}</span>
                    {entry.payment.notes && (
                      <div className="text-muted small">{entry.payment.notes}</div>
                    )}
                  </td>
                  <td className="text-end text-danger">
                    -{formatCurrency(entry.payment.amount)}
                  </td>
                  <td className={`text-end fw-bold ${entry.runningBalance === 0 ? 'text-success' : ''}`}>
                    {formatCurrency(entry.runningBalance)}
                  </td>
                </tr>
              ))}
              <tr className="border-top">
                <td colSpan={4} className="text-end fw-bold">
                  Remaining Balance
                </td>
                <td className={`text-end fw-bold ${finalBalance === 0 ? 'text-success' : ''}`}>
                  {formatCurrency(finalBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
