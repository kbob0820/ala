import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Pagination } from '@/components/Pagination';
import type { Loan, PaginatedResponse } from '@/types';
import { getLoans, updateReviewStatus, approveLoan, rejectLoan } from '@/services/loanService';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function LoanApprovalPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [approveLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [approveRate, setApproveRate] = useState('');
  const [approveTerm, setApproveTerm] = useState('');

  const [rejectLoanId, setRejectLoanId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: PaginatedResponse<Loan> = await getLoans({
        application_status: 'submitted,under_review,pending_documents',
        page,
        per_page: 15,
      });
      setLoans(data.data);
      setMeta(data.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load loans.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleStartReview = async (id: number) => {
    setActionLoading(true);
    try {
      await updateReviewStatus(id, 'under_review');
      fetchLoans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestDocs = async (id: number) => {
    setActionLoading(true);
    try {
      await updateReviewStatus(id, 'pending_documents');
      fetchLoans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeReview = async (id: number) => {
    setActionLoading(true);
    try {
      await updateReviewStatus(id, 'under_review');
      fetchLoans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveModal = (loan: Loan) => {
    setSelectedLoanId(loan.id);
    setSelectedLoan(loan);
    setApproveAmount(loan.amount.toString());
    setApproveRate(loan.interest_rate_per_month.toString());
    setApproveTerm((loan.term_months ?? 0).toString());
  };

  const handleApprove = async () => {
    if (approveLoanId === null) return;
    setActionLoading(true);
    try {
      const modify: { amount?: number; interest_rate_per_month?: number; term_months?: number } = {};
      if (approveAmount) modify.amount = parseFloat(approveAmount);
      if (approveRate) modify.interest_rate_per_month = parseFloat(approveRate);
      if (approveTerm) modify.term_months = parseFloat(approveTerm);
      await approveLoan(approveLoanId, Object.keys(modify).length > 0 ? modify : undefined);
      setSelectedLoanId(null);
      setSelectedLoan(null);
      setApproveAmount('');
      setApproveRate('');
      setApproveTerm('');
      fetchLoans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve loan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (rejectLoanId === null) return;
    setActionLoading(true);
    try {
      await rejectLoan(rejectLoanId);
      setRejectLoanId(null);
      fetchLoans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject loan.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          Loan Approvals
          {meta && (
            <span className="badge bg-primary ms-2">{meta.total}</span>
          )}
        </h2>
        <button
          className="btn btn-outline-secondary"
          onClick={() => { setPage(1); fetchLoans(); }}
          disabled={loading}
        >
          <i className="fa-solid fa-arrows-rotate me-1" />
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : loans.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="fa-solid fa-clipboard-check fs-1 mb-2 d-block" />
          <p>No loan applications pending approval.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Borrower</th>
                  <th>Amount</th>
                  <th>Term</th>
                  <th>Interest Rate</th>
                  <th>Net Proceeds</th>
                  <th>Application Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan, index) => {
                  const rowNum = ((meta?.current_page ?? 1) - 1) * 15 + index + 1;
                  const netProceeds = loan.amount - (loan.amount * (loan.interest_rate_per_month / 100) * (loan.term_months ?? 0));

                  return (
                    <tr key={loan.id}>
                      <td>{rowNum}</td>
                      <td>
                        <Link to={`/loans/${loan.id}`} className="fw-bold">
                          Loan #{loan.id}
                        </Link>
                        <div className="text-muted small">{loan.client?.name ?? `Client #${loan.client_id}`}</div>
                      </td>
                      <td>{formatCurrency(loan.amount)}</td>
                      <td>{loan.term_months ? `${loan.term_months} mo` : '-'}</td>
                      <td>{loan.interest_rate_per_month}%</td>
                      <td>{formatCurrency(netProceeds)}</td>
                      <td>
                        <StatusBadge status={loan.application_status} />
                      </td>
                      <td>{formatDate(loan.created_at)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          {loan.application_status === 'submitted' && (
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => handleStartReview(loan.id)}
                              disabled={actionLoading}
                            >
                              Start Review
                            </button>
                          )}
                          {loan.application_status === 'under_review' && (
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => handleRequestDocs(loan.id)}
                              disabled={actionLoading}
                            >
                              Request Docs
                            </button>
                          )}
                          {loan.application_status === 'pending_documents' && (
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => handleResumeReview(loan.id)}
                              disabled={actionLoading}
                            >
                              Resume Review
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openApproveModal(loan)}
                            disabled={actionLoading}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setRejectLoanId(loan.id)}
                            disabled={actionLoading}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && (
            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {approveLoanId !== null && selectedLoan !== null && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Approve Loan</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => { setSelectedLoanId(null); setSelectedLoan(null); }}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    Approve <strong>{selectedLoan.client?.name ?? `Client #${selectedLoan.client_id}`}</strong>
                    {' '}loan for <strong>{formatCurrency(selectedLoan.amount)}</strong>?
                  </p>
                  <p className="text-muted small">Optionally modify the loan terms before approval:</p>
                  <div className="mb-3">
                    <label htmlFor="approveAmount" className="form-label">
                      Amount
                    </label>
                    <input
                      id="approveAmount"
                      type="number"
                      className="form-control"
                      value={approveAmount}
                      onChange={(e) => setApproveAmount(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="approveRate" className="form-label">
                      Interest Rate %
                    </label>
                    <input
                      id="approveRate"
                      type="number"
                      className="form-control"
                      value={approveRate}
                      onChange={(e) => setApproveRate(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="approveTerm" className="form-label">
                      Term (months)
                    </label>
                    <input
                      id="approveTerm"
                      type="number"
                      className="form-control"
                      value={approveTerm}
                      onChange={(e) => setApproveTerm(e.target.value)}
                      step="0.5"
                      min={0.5}
                      max={5}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => { setSelectedLoanId(null); setSelectedLoan(null); }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        show={rejectLoanId !== null}
        title="Reject Loan"
        message="Are you sure you want to reject this application?"
        confirmLabel="Reject"
        confirmVariant="danger"
        onConfirm={handleReject}
        onCancel={() => setRejectLoanId(null)}
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
