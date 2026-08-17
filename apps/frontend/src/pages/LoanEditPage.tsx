import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoanForm } from '@/components/LoanForm';
import type { LoanFormFields } from '@/components/LoanForm';
import { getLoan, updateLoan } from '@/services/loanService';
import type { Loan } from '@/types';

function extractError(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { error?: { message?: string; details?: Record<string, string[]> } } } }).response;
    const details = response?.data?.error?.details;
    if (details) {
      return Object.entries(details)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join('; ');
    }
    return response?.data?.error?.message ?? null;
  }
  return err instanceof Error ? err.message : null;
}

export default function LoanEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLoan() {
      try {
        const data = await getLoan(Number(id));
        setLoan(data);
      } catch (err: unknown) {
        setError(extractError(err) ?? 'Failed to load loan.');
      } finally {
        setFetchLoading(false);
      }
    }
    fetchLoan();
  }, [id]);

  async function handleSubmit(fields: LoanFormFields) {
    setLoading(true);
    setError(null);
    try {
      await updateLoan(Number(id), {
        amount: parseFloat(fields.amount),
        term_months: parseFloat(fields.term_months),
        interest_rate_per_month: parseFloat(fields.interest_rate_per_month),
        charges: parseFloat(fields.charges),
        charges_description: fields.charges_description || null,
        old_balance_settlement: parseFloat(fields.old_balance_settlement),
        guarantor: fields.guarantor || null,
        first_payment_due_date: fields.first_payment_due_date || undefined,
      });
      navigate(`/loans/${id}`);
    } catch (err: unknown) {
      setError(extractError(err) ?? 'Failed to update loan.');
    } finally {
      setLoading(false);
    }
  }

  if (fetchLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!loan) {
    return <div className="alert alert-warning">Loan not found</div>;
  }

  return (
    <div>
      <h2 className="mb-1">Edit Loan #{loan.id}</h2>
      <p className="text-muted mb-4">
        {loan.client ? `Borrower: ${loan.client.name}` : `Client #${loan.client_id}`}
      </p>

      <LoanForm
        clientId={loan.client_id}
        borrowerName={loan.client?.name}
        mode="edit"
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/loans/${id}`)}
        loading={loading}
        error={error}
        initialData={{
          amount: loan.amount?.toString(),
          term_months: loan.term_months?.toString(),
          interest_rate_per_month: loan.interest_rate_per_month?.toString(),
          charges: loan.charges?.toString(),
          charges_description: loan.charges_description ?? '',
          old_balance_settlement: loan.old_balance_settlement?.toString(),
          guarantor: loan.guarantor ?? '',
          first_payment_due_date: loan.first_payment_due_date ?? '',
        }}
      />
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
