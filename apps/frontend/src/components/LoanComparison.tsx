import { OutstandingBalance } from '@/components/OutstandingBalance';
import type { Loan } from '@/types';

interface ExistingLoanSummary {
  id: number;
  amount: number;
  remaining_balance: number;
  loan_status: string;
  term_months: number | null;
}

interface NewLoanSummary {
  amount: number;
  term_months: number;
  net_proceeds: number;
  total_interest: number;
  installment_amount: number;
  total_installments: number;
}

interface LoanComparisonProps {
  existingLoans: ExistingLoanSummary[];
  newLoan: NewLoanSummary;
  totalExistingBalance: number;
  netProceedsAfterDeduction: number;
  totalExposure: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

export function LoanComparison({
  existingLoans,
  newLoan,
  totalExistingBalance,
  netProceedsAfterDeduction,
  totalExposure,
}: LoanComparisonProps) {
  return (
    <div>
      <h6>Existing Loans</h6>
      <OutstandingBalance
        loans={
          existingLoans.map((l) => ({
            id: l.id,
            amount: l.amount,
            remaining_balance: l.remaining_balance,
            loan_status: l.loan_status as Loan['loan_status'],
          })) as Loan[]
        }
      />
      <p className="mt-2 mb-1">
        <strong>Total Existing Balance:</strong> {formatCurrency(totalExistingBalance)}
      </p>

      <hr />

      <h6>New Loan</h6>
      <table className="table table-sm">
        <tbody>
          <tr>
            <td>Amount</td>
            <td>{formatCurrency(newLoan.amount)}</td>
          </tr>
          <tr>
            <td>Term</td>
            <td>{newLoan.total_installments} installments ({newLoan.term_months} months)</td>
          </tr>
          <tr>
            <td>Net Proceeds</td>
            <td>{formatCurrency(newLoan.net_proceeds)}</td>
          </tr>
          <tr>
            <td>Net Proceeds After Deduction</td>
            <td><strong>{formatCurrency(netProceedsAfterDeduction)}</strong></td>
          </tr>
        </tbody>
      </table>

      <p className="mb-1">
        <strong>Total Exposure:</strong> {formatCurrency(totalExposure)}
      </p>

      <div className="alert alert-warning mt-3 mb-0">
        <i className="fa-solid fa-triangle-exclamation me-2" />
        This reloan will auto-close existing loan balances.
      </div>
    </div>
  );
}
