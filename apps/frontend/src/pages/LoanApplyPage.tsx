import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LoanForm } from '@/components/LoanForm';
import type { LoanFormFields } from '@/components/LoanForm';
import { createLoan } from '@/services/loanService';
import { getClient } from '@/services/clientService';
import { DEFAULT_INTEREST_RATE, type LoanCalculation } from '@/types';

interface LocationState {
  amount?: number;
  term_months?: number;
  interest_rate_per_month?: number;
  first_payment_due_date?: string;
  calculation?: LoanCalculation;
  oldBalance?: number;
  parentLoanId?: number;
}

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

export default function LoanApplyPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? {};

  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    getClient(Number(clientId))
      .then((client) => setClientName(client.name))
      .catch(() => {});
  }, [clientId]);

  const latestFieldsRef = useRef<LoanFormFields>({
    amount: state.amount?.toString() ?? '',
    term_months: state.term_months?.toString() ?? '',
    interest_rate_per_month: state.interest_rate_per_month?.toString() ?? DEFAULT_INTEREST_RATE,
    charges: '0',
    charges_description: '',
    old_balance_settlement: (state.oldBalance ?? state.calculation?.total_existing_balance ?? 0).toString(),
    first_payment_due_date: state.first_payment_due_date ?? '',
  });

  async function doCreate(fields: LoanFormFields, applicationStatus: string) {
    setError(null);

    if (!fields.amount.trim() || !fields.term_months.trim()) {
      setError('Amount and Term are required.');
      throw new Error('Amount and Term are required.');
    }

    const loan = await createLoan({
      client_id: Number(clientId),
      amount: parseFloat(fields.amount),
      term_months: parseFloat(fields.term_months),
      interest_rate_per_month: parseFloat(fields.interest_rate_per_month),
      charges: parseFloat(fields.charges),
      charges_description: fields.charges_description || null,
      parent_loan_id: state.parentLoanId,
      loan_type: state.parentLoanId ? 'reloan' : 'regular',
      old_balance_settlement: parseFloat(fields.old_balance_settlement),
      guarantor: fields.guarantor || null,
      first_payment_due_date: fields.first_payment_due_date || undefined,
      application_status: applicationStatus,
    });
    navigate(`/loans/${loan.id}`);
  }

  async function handleSubmit(fields: LoanFormFields) {
    latestFieldsRef.current = fields;
    setLoading(true);
    try {
      await doCreate(fields, 'draft');
    } catch (err: unknown) {
      setError(extractError(err) ?? 'Failed to save loan.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSecondaryAction() {
    setSecondaryLoading(true);
    try {
      await doCreate(latestFieldsRef.current, 'submitted');
    } catch (err: unknown) {
      setError(extractError(err) ?? 'Failed to submit loan.');
    } finally {
      setSecondaryLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1">New Loan Application</h2>
      <p className="text-muted mb-4">For {clientName ?? `Borrower #${clientId}`}</p>

      <LoanForm
        clientId={Number(clientId)}
        borrowerName={clientName ?? undefined}
        mode="create"
        showReloanFields={!!state.parentLoanId}
        submitLabel="Save as Draft"
        secondaryLabel="Submit for Review"
        onSubmit={handleSubmit}
        onSecondaryAction={handleSecondaryAction}
        onFieldsChange={(fields) => { latestFieldsRef.current = fields; }}
        onCancel={() => navigate(`/clients/${clientId}`)}
        loading={loading}
        secondaryLoading={secondaryLoading}
        error={error}
        initialData={{
          amount: state.amount?.toString(),
          term_months: state.term_months?.toString(),
          interest_rate_per_month: state.interest_rate_per_month?.toString(),
          first_payment_due_date: state.first_payment_due_date,
          old_balance_settlement: (state.oldBalance ?? state.calculation?.total_existing_balance ?? 0).toString(),
        }}
      />
    </div>
  );
}
