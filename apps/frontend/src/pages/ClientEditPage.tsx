import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClientForm } from '@/components/ClientForm';
import { getClient, updateClient } from '@/services/clientService';
import type { Client } from '@/types';

export function ClientEditPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function fetchClient() {
      setFetching(true);
      setFetchError(null);

      try {
        const data = await getClient(clientId);
        setClient(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load borrower';
        setFetchError(message);
      } finally {
        setFetching(false);
      }
    }

    fetchClient();
  }, [clientId]);

  async function handleSubmit(formData: FormData) {
    setGeneralError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await updateClient(clientId, formData);
      navigate(`/clients/${clientId}`);
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
          err instanceof Error ? err.message : 'Failed to update borrower';
        setGeneralError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (fetching) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return <div className="alert alert-danger">{fetchError}</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Edit Borrower</h1>
        <Link to={`/clients/${clientId}`} className="btn btn-outline-secondary">
          Cancel
        </Link>
      </div>

      {client && (
        <ClientForm
          initialData={client}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/clients/${clientId}`)}
          submitLabel="Update Borrower"
          loading={submitting}
          generalError={generalError}
          fieldErrors={fieldErrors}
        />
      )}
    </div>
  );
}
