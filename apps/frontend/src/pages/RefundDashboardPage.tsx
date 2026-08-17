import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { detectAllOverpayments } from '@/services/refundService';
import { Pagination } from '@/components/Pagination';
import type { OverpaymentInfo } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

const PER_PAGE = 10;

export function RefundDashboardPage() {
  const [overpayments, setOverpayments] = useState<OverpaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);

    detectAllOverpayments()
      .then((data) => {
        setOverpayments(data);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load overpayment data';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return overpayments;
    const q = search.toLowerCase();
    return overpayments.filter((o) => o.clientName.toLowerCase().includes(q));
  }, [overpayments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const totalOverpayment = overpayments.reduce((sum, o) => sum + o.overpayment, 0);
  const avgOverpayment =
    overpayments.length > 0 ? totalOverpayment / overpayments.length : 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">Refund Management</h1>
          <p className="text-muted mb-0">Overpayment Detection & Refund Processing</p>
        </div>
      </div>

      <div className="alert alert-info mb-4">
        <i className="fa-solid fa-circle-info me-2" />
        Overpayments are detected automatically against total outstanding (including unpaid late fees). Request a
        refund to start the approval workflow.
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="ala-stat-card h-100">
            <div className="card-body d-flex align-items-center">
              <i className="fa-solid fa-file-invoice-dollar fa-2x me-3" />
              <div>
                <div className="fs-5 fw-bold">{overpayments.length}</div>
                <small>Overpaid Loans</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="ala-stat-card h-100">
            <div className="card-body d-flex align-items-center">
              <i className="fa-solid fa-coins fa-2x me-3" />
              <div>
                <div className="fs-5 fw-bold">{formatCurrency(totalOverpayment)}</div>
                <small>Total Overpayment</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="ala-stat-card h-100">
            <div className="card-body d-flex align-items-center">
              <i className="fa-solid fa-rotate-left fa-2x me-3" />
              <div>
                <div className="fs-5 fw-bold">0</div>
                <small>Refund Requests</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="ala-stat-card h-100">
            <div className="card-body d-flex align-items-center">
              <i className="fa-solid fa-chart-line fa-2x me-3" />
              <div>
                <div className="fs-5 fw-bold">{formatCurrency(avgOverpayment)}</div>
                <small>Avg Overpayment</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ala-card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Detected Overpayments{' '}
            <span className="badge bg-secondary">{overpayments.length}</span>
          </h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <input
                type="search"
                className="form-control"
                placeholder="Search by borrower name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {loading && (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {!loading && !error && filtered.length === 0 && !search.trim() && (
            <div className="text-center py-5">
              <i className="fa-solid fa-check-circle fa-3x text-success mb-3" />
              <h5>No overpayments detected</h5>
              <p className="text-muted">All loans are properly balanced</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && search.trim() && (
            <div className="text-center py-5 text-muted">
              No results matching &ldquo;{search}&rdquo;
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Loan #</th>
                      <th>Borrower</th>
                      <th>Loan Amount</th>
                      <th>Total Paid</th>
                      <th>Late Fees</th>
                      <th>Overpayment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((o, idx) => (
                      <tr key={o.loanId}>
                        <td>{(safePage - 1) * PER_PAGE + idx + 1}</td>
                        <td>{o.loanNumber ?? o.loanId}</td>
                        <td>
                          <Link to={`/clients/${o.clientId}`}>{o.clientName}</Link>
                        </td>
                        <td>{formatCurrency(o.loanAmount)}</td>
                        <td>{formatCurrency(o.totalPaid)}</td>
                        <td>{formatCurrency(o.lateFees)}</td>
                        <td>
                          <strong className="text-success">{formatCurrency(o.overpayment)}</strong>
                        </td>
                        <td>
                          <Link
                            to={`/refunds/request/${o.loanId}`}
                            className="btn btn-sm btn-primary"
                          >
                            Request Refund
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={safePage}
                lastPage={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
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
