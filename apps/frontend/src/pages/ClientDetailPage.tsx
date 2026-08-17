import { useState, useCallback, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getClient, deleteClient, restoreClient, forceDeleteClient, uploadClientDocument, deleteDocument } from '@/services/clientService';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/types';
import type { Client, Document } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

type LoanSummary = {
  id: number;
  amount: number;
  loan_status: string;
  application_status: string;
  created_at: string;
};

type ClientDetail = Client & {
  documents: Document[];
  loans: LoanSummary[];
};

const ACTIVE_LOAN_STATUSES = ['waiting_for_release', 'released', 'active', 'past_due', 'delinquent', 'restructured'];
const COMPLETED_LOAN_STATUSES = ['fully_paid', 'closed', 'settled_by_reloan'];
const DEFAULTED_LOAN_STATUSES = ['defaulted'];

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);

  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [documentDeleteConfirm, setDocumentDeleteConfirm] = useState<{
    show: boolean;
    documentId: number | null;
  }>({ show: false, documentId: null });

  const fetchClient = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getClient(clientId);
      setClient(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load client';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  async function handleDeleteClient() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteClient(clientId);
      navigate('/clients');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      if (msg.toUpperCase().includes('HAS_LOANS')) {
        setDeleteError('Cannot delete this borrower because they have existing loans. Please close all loans first.');
      } else {
        setDeleteError(msg);
      }
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleRestoreClient() {
    setRestoring(true);
    setDeleteError(null);

    try {
      const restored = await restoreClient(clientId);
      setClient(restored as ClientDetail);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to restore client');
    } finally {
      setRestoring(false);
    }
  }

  async function handleForceDeleteClient() {
    setForceDeleting(true);
    setDeleteError(null);

    try {
      await forceDeleteClient(clientId);
      navigate('/clients');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Force delete failed';
      if (msg.toUpperCase().includes('HAS_LOANS')) {
        setDeleteError('Cannot permanently delete this borrower because they have existing loans.');
      } else {
        setDeleteError(msg);
      }
      setShowDeleteModal(false);
    } finally {
      setForceDeleting(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadType || !uploadFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      const doc = await uploadClientDocument(clientId, uploadType, uploadFile);
      setClient((prev) => {
        if (!prev) return prev;
        return { ...prev, documents: [...prev.documents, doc] };
      });
      setUploadType('');
      setUploadFile(null);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(documentId: number) {
    try {
      await deleteDocument(documentId);
      setClient((prev) => {
        if (!prev) return prev;
        return { ...prev, documents: prev.documents.filter((d) => d.id !== documentId) };
      });
    } catch {
      // silently fail
    } finally {
      setDocumentDeleteConfirm({ show: false, documentId: null });
    }
  }

  const isAdmin = user?.role?.slug === 'admin';

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

  if (!client) {
    return <div className="alert alert-warning">Client not found</div>;
  }

  const activeLoans = client.loans.filter((l) => ACTIVE_LOAN_STATUSES.includes(l.loan_status));
  const completedLoans = client.loans.filter((l) => COMPLETED_LOAN_STATUSES.includes(l.loan_status));
  const defaultedLoans = client.loans.filter((l) => DEFAULTED_LOAN_STATUSES.includes(l.loan_status));

  const isInactive = !client.is_active;

  const socialMediaEntries = client.social_media
    ? Object.entries(client.social_media).map(([key, val]) => ({ key, value: val }))
    : [];

  return (
    <div>
      {deleteError && <div className="alert alert-danger">{deleteError}</div>}

      <div className="ala-page-header">
        <div className="ala-page-header-left">
          <nav className="ala-breadcrumbs">
            <Link to="/clients" className="ala-breadcrumb-link">Borrowers</Link>
            <i className="fa-solid fa-chevron-right ala-breadcrumb-sep" />
              <span className="ala-breadcrumb-current">Borrower #{client.id}</span>
          </nav>
          <h1 style={{ fontSize: 'var(--ala-text-4xl)', fontWeight: 700, margin: 0 }}>
            {client.name}{' '}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.1875rem 0.5625rem',
                borderRadius: '9999px',
                backgroundColor: client.is_active ? 'var(--ala-success-50)' : 'var(--ala-gray-100)',
                color: client.is_active ? 'var(--ala-success-600)' : 'var(--ala-gray-600)',
                fontSize: 'var(--ala-text-xs)',
                fontWeight: 500,
                verticalAlign: 'middle',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: client.is_active ? 'var(--ala-success-600)' : 'var(--ala-gray-500)',
                }}
              />
              {client.is_active ? 'Active' : 'Inactive'}
            </span>
          </h1>
        </div>
        <div className="ala-page-header-actions">
          <Link to={`/loans/new/${client.id}`} className="btn btn-primary">
            <i className="fa-solid fa-plus me-1" />
            New Loan
          </Link>
          <Link to={`/clients/${client.id}/edit`} className="btn btn-outline-secondary">
            Edit
          </Link>
          {isAdmin && !isInactive && (
            <button
              className="btn btn-outline-danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
            >
              Delete
            </button>
          )}
          {isAdmin && isInactive && (
            <>
              <button
                className="btn btn-outline-success"
                onClick={handleRestoreClient}
                disabled={restoring}
              >
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => setShowDeleteModal(true)}
                disabled={forceDeleting}
              >
                Force Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ala-tabs">
        {['overview', 'employment', 'address', 'documents', 'loans'].map((tab) => (
          <button
            key={tab}
            className={`ala-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="ala-card">
          <div style={{ padding: 'var(--ala-space-5)' }}>
            {client.photo_url ? (
              <div className="mb-3">
                <img
                  src={client.photo_url}
                  alt={client.name}
                  className="img-thumbnail rounded"
                  style={{ maxHeight: 250 }}
                />
              </div>
            ) : (
              <div className="mb-3 d-flex align-items-center justify-content-center bg-light rounded" style={{ height: 200, width: 200 }}>
                <span className="text-muted">No Photo</span>
              </div>
            )}
            <table className="table table-bordered">
              <tbody>
                <tr>
                  <th className="table-light" style={{ width: 200 }}>Name</th>
                  <td>{client.name}</td>
                </tr>
                <tr>
                  <th className="table-light">Contact Number</th>
                  <td>{client.contact_number || '\u2014'}</td>
                </tr>
                <tr>
                  <th className="table-light">Social Media</th>
                  <td>
                    {socialMediaEntries.length > 0 ? (
                      <ul className="list-unstyled mb-0">
                        {socialMediaEntries.map((entry, i) => (
                          <li key={i}>
                            {entry.key}: {entry.value}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      '\u2014'
                    )}
                  </td>
                </tr>
                <tr>
                  <th className="table-light">Notes</th>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{client.notes || '\u2014'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'employment' && (
        <div className="ala-card">
          <div style={{ padding: 'var(--ala-space-5)' }}>
            {client.work || client.work_address ? (
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <th className="table-light" style={{ width: 200 }}>Occupation / Employer</th>
                    <td>{client.work || '\u2014'}</td>
                  </tr>
                  <tr>
                    <th className="table-light">Work Address</th>
                    <td>{client.work_address || '\u2014'}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-muted mb-0">No employment information recorded</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'address' && (
        <div className="ala-card">
          <div style={{ padding: 'var(--ala-space-5)' }}>
            {client.address ? (
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <th className="table-light" style={{ width: 200 }}>Residential Address</th>
                    <td>{client.address}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-muted mb-0">No address recorded</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <div className="ala-card mb-4">
            <div style={{ padding: 'var(--ala-space-5)' }}>
              <h6 style={{ fontSize: 'var(--ala-text-base)', fontWeight: 600, marginBottom: 'var(--ala-space-4)' }}>Upload Document</h6>
              {uploadError && <div className="alert alert-danger">{uploadError}</div>}
              <form onSubmit={handleUpload} className="row g-2 align-items-end">
                <div className="col-md-4">
                  <label htmlFor="upload-type" className="form-label">Type</label>
                  <select
                    id="upload-type"
                    className="form-select"
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    required
                  >
                    <option value="">Select type...</option>
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {DOCUMENT_TYPE_LABELS[t] ?? t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label htmlFor="upload-file" className="form-label">File</label>
                  <input
                    id="upload-file"
                    type="file"
                    className="form-control"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </div>
                <div className="col-md-2">
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={uploading || !uploadType || !uploadFile}
                  >
                    {uploading ? '...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {client.documents.length === 0 ? (
            <p className="text-muted text-center py-3">No documents</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Filename</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {client.documents.map((doc, idx) => (
                    <tr key={doc.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className="badge bg-secondary">
                          {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                        </span>
                      </td>
                      <td>{doc.original_name}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <a
                            href={doc.view_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-primary"
                          >
                            View
                          </a>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => setDocumentDeleteConfirm({ show: true, documentId: doc.id })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'loans' && (
        <div>
          <div className="ala-stats-row" style={{ marginBottom: 'var(--ala-space-5)' }}>
            <div className="ala-stat-card">
              <div className="ala-stat-icon" style={{ backgroundColor: 'var(--ala-blue-50)', color: 'var(--ala-blue-700)' }}>
                <i className="fa-solid fa-file-invoice" />
              </div>
              <div>
                <div className="ala-stat-value">{activeLoans.length}</div>
                <div className="ala-stat-label">Active Loans</div>
              </div>
            </div>
            <div className="ala-stat-card">
              <div className="ala-stat-icon" style={{ backgroundColor: 'var(--ala-success-50)', color: 'var(--ala-success-600)' }}>
                <i className="fa-solid fa-circle-check" />
              </div>
              <div>
                <div className="ala-stat-value">{completedLoans.length}</div>
                <div className="ala-stat-label">Fully Paid</div>
              </div>
            </div>
            <div className="ala-stat-card">
              <div className="ala-stat-icon" style={{ backgroundColor: 'var(--ala-danger-50)', color: 'var(--ala-danger-600)' }}>
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div>
                <div className="ala-stat-value">{defaultedLoans.length}</div>
                <div className="ala-stat-label">Defaulted</div>
              </div>
            </div>
          </div>

          {client.loans.length === 0 ? (
            <p className="text-muted text-center py-3">No loan history</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Loan #</th>
                    <th>Amount</th>
                    <th>Application Status</th>
                    <th>Loan Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {client.loans.map((loan, idx) => (
                    <tr key={loan.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <Link to={`/loans/${loan.id}`}>{loan.loan_number ?? loan.id}</Link>
                      </td>
                      <td>{formatCurrency(loan.amount)}</td>
                      <td>
                        <StatusBadge status={loan.application_status} />
                      </td>
                      <td>
                        <StatusBadge status={loan.loan_status} />
                      </td>
                      <td>{formatDate(loan.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        show={showDeleteModal}
        title={isInactive ? 'Permanently Delete Borrower' : 'Deactivate Borrower'}
        message={isInactive
          ? 'Are you sure you want to permanently delete this borrower? This action cannot be undone.'
          : 'Are you sure you want to deactivate this borrower? They can be restored later.'
        }
        confirmLabel={isInactive ? 'Force Delete' : 'Deactivate'}
        confirmVariant="danger"
        onConfirm={isInactive ? handleForceDeleteClient : handleDeleteClient}
        onCancel={() => setShowDeleteModal(false)}
      />

      <ConfirmModal
        show={documentDeleteConfirm.show}
        title="Delete Document"
        message="Are you sure you want to delete this document?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => documentDeleteConfirm.documentId && handleDeleteDocument(documentDeleteConfirm.documentId)}
        onCancel={() => setDocumentDeleteConfirm({ show: false, documentId: null })}
      />

      <style>{`
        .ala-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--ala-space-4);
          margin-bottom: var(--ala-space-6);
          flex-wrap: wrap;
        }
        .ala-page-header-left {
          min-width: 0;
        }
        .ala-page-header-actions {
          display: flex;
          align-items: center;
          gap: var(--ala-space-2);
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .ala-breadcrumbs {
          display: flex;
          align-items: center;
          gap: var(--ala-space-2);
          font-size: var(--ala-text-xs);
          margin-bottom: var(--ala-space-2);
          flex-wrap: wrap;
        }
        .ala-breadcrumb-link {
          color: var(--ala-gray-600);
          text-decoration: none;
        }
        .ala-breadcrumb-link:hover {
          color: var(--ala-blue-700);
        }
        .ala-breadcrumb-current {
          color: var(--ala-gray-800);
          font-weight: 500;
        }
        .ala-breadcrumb-sep {
          font-size: 0.5625rem;
          color: var(--ala-gray-400);
          margin: 0 var(--ala-space-1);
        }
        .ala-tabs {
          display: flex;
          gap: 1px;
          border-bottom: 2px solid var(--ala-gray-300);
          margin-bottom: var(--ala-space-5);
        }
        .ala-tab {
          padding: var(--ala-space-3) var(--ala-space-5);
          border: none;
          background: none;
          font-size: var(--ala-text-sm);
          font-weight: 500;
          color: var(--ala-gray-600);
          cursor: pointer;
          transition: all var(--ala-transition-fast);
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }
        .ala-tab:hover {
          color: var(--ala-gray-800);
        }
        .ala-tab.active {
          color: var(--ala-blue-700);
          border-bottom-color: var(--ala-blue-700);
          font-weight: 600;
        }
        .ala-card {
          background: var(--ala-white);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-lg);
          overflow: hidden;
        }
        .ala-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--ala-space-4);
        }
        @media (max-width: 767.98px) {
          .ala-stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .ala-stat-card {
          background: var(--ala-white);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-lg);
          padding: var(--ala-space-5);
          display: flex;
          align-items: center;
          gap: var(--ala-space-4);
        }
        .ala-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--ala-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          flex-shrink: 0;
        }
        .ala-stat-value {
          font-size: var(--ala-text-lg);
          font-weight: 700;
          color: var(--ala-gray-900);
          line-height: 1.3;
        }
        .ala-stat-label {
          font-size: var(--ala-text-xs);
          color: var(--ala-gray-600);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
