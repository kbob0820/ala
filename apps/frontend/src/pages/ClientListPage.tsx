import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getClients, deleteClient } from '@/services/clientService';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import type { ClientListItem, PaginatedResponse, ClientFilters } from '@/types';
import { CLIENT_STATUS_LABELS } from '@/types';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

function parseLoansByStatus(loansByStatus: string): Record<string, number> {
  try {
    return JSON.parse(loansByStatus);
  } catch {
    return {};
  }
}

export function ClientListPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ClientListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ClientFilters = {
        per_page: perPage,
        page: currentPage,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter as ClientFilters['status'];
      }

      const result: PaginatedResponse<ClientListItem> = await getClients(params);

      setClients(result.data);
      setLastPage(result.meta.last_page);
      setTotal(result.meta.total);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load borrowers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, perPage, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchClients]);

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteLoading(true);

    try {
      await deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      await fetchClients();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete borrower',
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function handlePerPageChange(value: number) {
    setPerPage(value);
    setCurrentPage(1);
  }

  const hasFilters = search || statusFilter !== 'all';

  return (
    <div>
      <PageHeader
        title="Borrowers"
        breadcrumbs={[{ label: 'Borrowers' }]}
        actions={
          <Link to="/clients/new" className="btn btn-primary">
            <i className="fa-solid fa-plus me-1" />
            Add Borrower
          </Link>
        }
      />

      <div className="ala-filter-bar">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">
                <i className="fa-solid fa-search" />
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Search by name or contact number..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
          <div className="col-auto">
            <span className="ala-filter-count">
              Showing {clients.length} of {total}
            </span>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible d-flex align-items-center">
          <i className="fa-solid fa-circle-exclamation me-2" />
          {error}
          <button
            type="button"
            className="btn-close ms-auto"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <EmptyState
          icon="fa-solid fa-address-book"
          title="No borrowers found"
          description={hasFilters ? 'Try adjusting your filters' : 'Register your first borrower to get started'}
          actionLabel={hasFilters ? undefined : 'Add Borrower'}
          actionTo={hasFilters ? undefined : '/clients/new'}
        />
      )}

      {!loading && !error && clients.length > 0 && (
        <>
          <div className="ala-card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Occupation</th>
                    <th>Address</th>
                    <th>Loans</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const statusMap = parseLoansByStatus(client.loans_by_status);
                    return (
                      <tr key={client.id} className={client.is_active ? '' : 'table-secondary text-muted'}>
                        <td className="fw-medium">{client.id}</td>
                        <td>
                          {client.photo_url ? (
                            <img
                              src={client.photo_url}
                              alt={client.name}
                              className="rounded-circle"
                              style={{ width: 36, height: 36, objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white"
                              style={{
                                width: 36,
                                height: 36,
                                fontSize: '0.8125rem',
                                backgroundColor: 'var(--ala-navy-700)',
                              }}
                            >
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td>
                          <Link to={`/clients/${client.id}`} className="fw-medium">
                            {client.name}
                          </Link>
                        </td>
                        <td>{client.contact_number || <span className="text-muted">—</span>}</td>
                        <td>{client.work || <span className="text-muted">—</span>}</td>
                        <td>
                          <span
                            className="d-inline-block text-truncate"
                            style={{ maxWidth: 180 }}
                            title={client.address ?? undefined}
                          >
                            {client.address || <span className="text-muted">—</span>}
                          </span>
                        </td>
                        <td className="fw-medium">{client.loans_count}</td>
                        <td>
                          {Object.entries(statusMap).length === 0
                            ? <span className="text-muted">—</span>
                            : Object.entries(statusMap).map(([status, count]) => (
                                <span key={status} className="me-2 d-inline-flex align-items-center gap-1">
                                  <StatusBadge status={status} />
                                  <small className="text-muted">{count as number}</small>
                                </span>
                              ))}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Link
                              to={`/clients/${client.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              View
                            </Link>
                            <Link
                              to={`/clients/${client.id}/edit`}
                              className="btn btn-sm btn-outline-secondary"
                            >
                              Edit
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeleteTarget(client)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {deleteTarget && (
        <ConfirmModal
          show={true}
          title="Delete Borrower"
          message={`Are you sure you want to delete "${deleteTarget.name}"?`}
          confirmVariant="danger"
          confirmLabel={deleteLoading ? 'Deleting...' : 'Delete'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <style>{`
        .ala-filter-bar {
          background: var(--ala-white);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-lg);
          padding: var(--ala-space-5);
          margin-bottom: var(--ala-space-5);
        }
        .ala-filter-count {
          font-size: var(--ala-text-sm);
          font-weight: 500;
          color: var(--ala-gray-600);
        }
        .ala-card {
          background: var(--ala-white);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-lg);
          overflow: hidden;
        }
        .input-group-text {
          background: var(--ala-white);
          border-color: var(--ala-gray-300);
          color: var(--ala-gray-500);
          font-size: var(--ala-text-sm);
        }
      `}</style>
    </div>
  );
}
