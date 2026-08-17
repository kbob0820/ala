import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClientForm } from '@/components/ClientForm';
import { createClient } from '@/services/clientService';

export function ClientCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(formData: FormData) {
    setGeneralError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const client = await createClient(formData);
      navigate(`/clients/${client.id}`);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'error' in err.response.data &&
        err.response.data.error &&
        typeof err.response.data.error === 'object' &&
        'details' in err.response.data.error
      ) {
        setFieldErrors(err.response.data.error.details as Record<string, string[]>);
      } else {
        const message =
          err instanceof Error ? err.message : 'Failed to create borrower';
        setGeneralError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">New Borrower</h1>
        <Link to="/clients" className="btn btn-outline-secondary">
          Cancel
        </Link>
      </div>

      <ClientForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/clients')}
        submitLabel="Save Borrower"
        loading={loading}
        generalError={generalError}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}
