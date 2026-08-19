import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLoans } from '@/services/loanService';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import type { Loan } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

const PER_PAGE = 15;

export default function ReloanDashboardPage() {
  const navigate = useNavigate();
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [eligibleLoans, setEligibleLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLoans({
        loan_status: 'active,past_due,delinquent',
        per_page: 100,
      });
      setAllLoans(result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    const eligible = allLoans.filter(
      (l) => l.term_months !== 1 && (l.unpaid_installments_count ?? 0) <= 2,
    );

    setEligibleLoans(eligible);
  }, [allLoans]);

  const filtered = eligibleLoans.filter((l) =>
    (l.client?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  );

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

  return (
    <div>
      <h1 className="mb-1">Reloan Management</h1>
      <p className="text-muted">Eligible Borrower Review</p>

      {eligibleLoans.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted mb-1">No eligible loans</p>
          <small className="text-muted">All loans are settled</small>
        </div>
      ) : (
        <div className="ala-card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Eligible Loans ({filtered.length})</h5>
            <div style={{ width: 300 }}>
              <input
                type="search"
                className="form-control"
                placeholder="Search borrower..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <div className="card-body p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-5 text-muted">No matching loans</div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-striped table-hover mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Loan #</th>
                        <th>Borrower</th>
                        <th>Gross Loan</th>
                        <th>Remaining Installments</th>
                        <th>Outstanding Balance</th>
                        <th>Status</th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((loan, idx) => (
                        <tr key={loan.id}>
                          <td>{(safePage - 1) * PER_PAGE + idx + 1}</td>
                          <td>
                            <Link to={`/loans/${loan.id}`} className="fw-bold">
                              {loan.loan_number ?? loan.id}
                            </Link>
                          </td>
                          <td>
                            <Link to={`/clients/${loan.client_id}`}>
                              {loan.client?.name ?? `Client #${loan.client_id}`}
                            </Link>
                          </td>
                          <td>{formatCurrency(loan.amount)}</td>
                          <td>{loan.unpaid_installments_count ?? 0} / {loan.total_installments}</td>
                          <td className="text-danger fw-semibold">
                            {formatCurrency(loan.remaining_balance ?? 0)}
                          </td>
                          <td>
                            <StatusBadge status={loan.loan_status ?? loan.application_status} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                navigate(`/reloan/calculate/${loan.client_id}`, {
                                  state: {
                                    amount: loan.amount,
                                    termMonths: loan.term_months,
                                    clientName: loan.client?.name,
                                    remainingBalance: loan.total_outstanding ?? loan.remaining_balance,
                                    parentLoanId: loan.id,
                                  },
                                })
                              }
                            >
                              Reloan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3">
                  <Pagination
                    currentPage={safePage}
                    lastPage={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
