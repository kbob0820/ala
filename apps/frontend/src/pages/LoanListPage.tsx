import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLoans } from '@/services/loanService';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import {
  APPLICATION_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  type Loan,
  type PaginatedResponse,
} from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export function LoanListPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [applicationStatus, setApplicationStatus] = useState('');
  const [loanStatus, setLoanStatus] = useState('');
  const [reloanOnly, setReloanOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result: PaginatedResponse<Loan> = await getLoans({
        application_status: applicationStatus || undefined,
        loan_status: loanStatus || undefined,
        search: search || undefined,
        reloan: reloanOnly || undefined,
        per_page: perPage,
        page: currentPage,
      });

      setLoans(result.data);
      setTotal(result.meta.total);
      setLastPage(result.meta.last_page);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load loans';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applicationStatus, loanStatus, reloanOnly, search, perPage, currentPage]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const hasFilters = applicationStatus || loanStatus || reloanOnly || search;

  return (
    <div>
      <PageHeader
        title="Loan Management"
        breadcrumbs={[]}
        actions={
          <Link to="/loans/calculator" className="btn btn-primary">
            <i className="fa-solid fa-plus me-1" />
            New Loan
          </Link>
        }
      />

      <p className="text-muted">Browse, filter, and manage all loan records including active, pending, and completed applications.</p>

      <div className="ala-filter-bar">
        <div className="row g-2 align-items-end">
          <div className="col-md-2">
            <label className="form-label">Application Status</label>
            <select
              className="form-select"
              value={applicationStatus}
              onChange={(e) => {
                setApplicationStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Loan Status</label>
            <select
              className="form-select"
              value={loanStatus}
              onChange={(e) => {
                setLoanStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              {Object.entries(LOAN_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Search</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fa-solid fa-search" />
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Search by client name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <div className="col-md-1">
            <label className="form-label">&nbsp;</label>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="reloanFilter"
                checked={reloanOnly}
                onChange={(e) => {
                  setReloanOnly(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              <label className="form-check-label" htmlFor="reloanFilter">
                Reloan
              </label>
            </div>
          </div>
          <div className="col-md-2">
            <label className="form-label">Per Page</label>
            <select
              className="form-select"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3">
            <span className="ala-filter-count">
              {total} loan{total !== 1 ? 's' : ''} found
            </span>
            <button
              className="btn btn-sm btn-outline-secondary ms-2"
              onClick={() => {
                setApplicationStatus('');
                setLoanStatus('');
                setReloanOnly(false);
                setSearch('');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && loans.length === 0 && (
        <EmptyState
          icon="fa-solid fa-file-invoice"
          title="No loans found"
          description={hasFilters ? 'Try adjusting your filters' : 'Create your first loan to get started'}
          actionLabel={hasFilters ? undefined : 'New Loan'}
          actionTo={hasFilters ? undefined : '/loans/calculator'}
        />
      )}

      {!loading && !error && loans.length > 0 && (
        <>
          <div className="ala-card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>LOAN ID</th>
                    <th>Borrower</th>
                    <th className="text-end">Amount</th>
                    <th className="text-end">Net Proceeds</th>
                    <th className="text-end">Balance</th>
                    <th>Rem. Install</th>
                    <th>App. Status</th>
                    <th>Loan Status</th>
                    <th>Date Released</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan, idx) => (
                    <tr key={loan.id}>
                      <td className="text-muted">{(currentPage - 1) * perPage + idx + 1}</td>
                      <td>
                        <Link to={`/loans/${loan.id}`} className="fw-bold">
                          Loan #{loan.id}
                        </Link>
                        {loan.loan_type === 'reloan' ? (
                          <span className="ala-loan-type-badge ala-loan-type-badge--reloan">
                            <i className="fa-solid fa-rotate" /> Reloan
                          </span>
                        ) : (
                          <span className="ala-loan-type-badge ala-loan-type-badge--new">New</span>
                        )}
                      </td>
                      <td>
                        {loan.client ? (
                          <Link to={`/clients/${loan.client_id}`} className="fw-medium">
                            {loan.client.name}
                          </Link>
                        ) : (
                          `Client #${loan.client_id}`
                        )}
                      </td>
                      <td className="text-end font-monospace">{formatCurrency(loan.amount)}</td>
                      <td className="text-end font-monospace">{formatCurrency(loan.net_proceeds)}</td>
                      <td className="text-end font-monospace">{formatCurrency(loan.remaining_balance ?? 0)}</td>
                      <td>{loan.unpaid_installments_count ?? 0} / {loan.total_installments}</td>
                      <td>
                        <StatusBadge status={loan.application_status} />
                      </td>
                      <td>
                        {loan.loan_status ? (
                          <StatusBadge status={loan.loan_status} />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-nowrap">
                        {loan.released_at ? new Date(loan.released_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                      </td>
                      <td>
                        <Link
                          to={`/loans/${loan.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
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
        .font-monospace {
          font-family: var(--ala-font-mono);
          font-size: var(--ala-text-sm);
        }
        .input-group-text {
          background: var(--ala-white);
          border-color: var(--ala-gray-300);
          color: var(--ala-gray-500);
          font-size: var(--ala-text-sm);
        }
        .ala-loan-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: 0.5rem;
          padding: 0.0625rem 0.4375rem;
          border-radius: 9999px;
          font-size: var(--ala-text-xs);
          font-weight: 500;
          line-height: 1.4;
          white-space: nowrap;
        }
        .ala-loan-type-badge--new {
          background: var(--ala-gray-100);
          color: var(--ala-gray-600);
        }
        .ala-loan-type-badge--reloan {
          background: var(--ala-blue-50);
          color: var(--ala-blue-700);
        }
      `}</style>
    </div>
  );
}
