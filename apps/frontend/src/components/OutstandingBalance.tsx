import { StatusBadge } from '@/components/StatusBadge';
import type { Loan } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

interface OutstandingBalanceProps {
  loans: Loan[];
}

export function OutstandingBalance({ loans }: OutstandingBalanceProps) {
  if (loans.length === 0) {
    return <p className="text-muted mb-0">No loans</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm table-striped mb-0">
        <thead>
          <tr>
            <th>Loan #</th>
            <th>Amount</th>
            <th>Remaining</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td>{loan.id}</td>
              <td>{formatCurrency(loan.amount)}</td>
              <td className="text-danger fw-semibold">
                {formatCurrency(loan.remaining_balance ?? 0)}
              </td>
              <td>
                <StatusBadge status={loan.loan_status ?? ''} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
