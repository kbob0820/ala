import { Fragment, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getPastDueLoans,
  undoPastDue,
  processPastDueLoan,
  updateInstallmentLateFee,
  updateCollectionStatus,
} from '@/services/loanService';
import { getSettings } from '@/services/settingsService';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ProcessPastDueModal } from '@/components/ProcessPastDueModal';
import {
  COLLECTION_STATUS_LABELS,
  type CollectionStatus,
  type OverdueInstallment,
  type PastDueLoan,
  type PaginatedResponse,
} from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'dark',
};

function InstallmentWaiverRow({
  installment,
  loading,
  canEdit,
  onSaveFee,
}: {
  installment: OverdueInstallment;
  loading: boolean;
  canEdit: boolean;
  onSaveFee: (installment: OverdueInstallment, amount: number) => void;
}) {
  const [fee, setFee] = useState(String(installment.late_fees));

  useEffect(() => {
    setFee(String(installment.late_fees));
  }, [installment.late_fees]);

  return (
    <tr>
      <td className="fw-medium">{installment.installment_number}</td>
      <td className="text-nowrap">{installment.due_date}</td>
      <td className="text-end font-monospace">{formatCurrency(installment.amount)}</td>
      <td className="text-end font-monospace">{formatCurrency(installment.paid_amount)}</td>
      <td className="text-end font-monospace">{formatCurrency(installment.waived_amount ?? 0)}</td>
      <td className="text-end font-monospace fw-semibold">{formatCurrency(installment.past_due_amount)}</td>
      <td>{installment.days_overdue} days</td>
      <td className="text-danger">
        {canEdit && installment.late_fee_editable ? (
          <div className="d-flex gap-1 align-items-center">
            <input
              type="number"
              className="form-control form-control-sm text-danger"
              style={{ width: '90px' }}
              min={0.01}
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={loading}
              onClick={() => onSaveFee(installment, Number(fee))}
            >
              Save
            </button>
          </div>
        ) : (
          <>
            {formatCurrency(installment.late_fees)}
            {installment.late_fees > 0 && !installment.late_fee_editable && (
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                partially paid
              </div>
            )}
          </>
        )}
      </td>
      <td><StatusBadge status={installment.status} /></td>
    </tr>
  );
}

export function PastDuePage() {
  const { user } = useAuth();
  const canManage =
    user?.role?.slug === 'administrator' || user?.role?.slug === 'approver';

  const [loans, setLoans] = useState<PastDueLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [defaultFee, setDefaultFee] = useState(500);
  const [processLoan, setProcessLoan] = useState<PastDueLoan | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmVariant?: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result: PaginatedResponse<PastDueLoan> = await getPastDueLoans({
        per_page: 15,
        page: currentPage,
      });

      setLoans(result.data);
      setLastPage(result.meta.last_page);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load past due loans';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    getSettings()
      .then((s) => setDefaultFee(s.late_fee_amount))
      .catch(() => setDefaultFee(500));
  }, []);

  async function handleStatusChange(
    loanId: number,
    newStatus: string,
  ) {
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);

    try {
      await updateCollectionStatus(loanId, newStatus);
      setActionSuccess('Collection status updated');
      await fetchLoans();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to update collection status',
      );
    } finally {
      setActionLoading(false);
    }
  }

  function toggleExpand(loanId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(loanId)) {
        next.delete(loanId);
      } else {
        next.add(loanId);
      }
      return next;
    });
  }

  function handleUndo(loan: PastDueLoan) {
    setActionError(null);
    setActionSuccess(null);
    setConfirmAction({
      title: 'Undo Past Due',
      message: `Reverse late fees and past-due status for ${loan.client.name}? Paid or waived fees are left intact.`,
      confirmVariant: 'danger',
      confirmLabel: 'Undo',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const result = await undoPastDue(loan.id);
          setActionSuccess(
            `${result.late_fees_reversed} late fee(s) reversed, ${result.installments_reverted} schedule(s) reverted.`,
          );
          await fetchLoans();
        } catch (err: unknown) {
          setActionError(
            err instanceof Error ? err.message : 'Failed to undo past-due processing',
          );
        } finally {
          setActionLoading(false);
        }
      },
    });
    setShowConfirmModal(true);
  }

  function handleOpenProcess(loan: PastDueLoan) {
    setActionError(null);
    setActionSuccess(null);
    setProcessLoan(loan);
  }

  async function handleProcessConfirm(installments: { id: number; late_fee: number }[]) {
    if (!processLoan) return;
    setActionLoading(true);
    try {
      const result = await processPastDueLoan(processLoan.id, installments);
      setActionSuccess(
        `${result.overdue_schedules} schedule(s): ${result.past_due_marked} marked past-due, ${result.late_fees_assessed} late fee(s) assessed.`,
      );
      setProcessLoan(null);
      await fetchLoans();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to process past-due',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveFee(
    loanId: number,
    installment: OverdueInstallment,
    amount: number,
  ) {
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);

    try {
      await updateInstallmentLateFee(loanId, installment.id, amount);
      setActionSuccess('Late fee updated');
      await fetchLoans();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to update late fee',
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4">Past Due Loans</h1>

      {actionError && (
        <div className="alert alert-danger alert-dismissible fade show">
          {actionError}
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionError(null)}
          />
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success alert-dismissible fade show">
          {actionSuccess}
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionSuccess(null)}
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

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && loans.length === 0 && (
        <div className="text-center py-5 text-muted">
          No past due loans
        </div>
      )}

      {!loading && !error && loans.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client Name</th>
                  <th>Amount</th>
                  <th>Late Fee</th>
                  <th>Total Outstanding</th>
                  <th>Overdue Installments</th>
                  <th>Max Days Overdue</th>
                  <th>Risk Level</th>
                  <th>Collection Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan, idx) => (
                  <Fragment key={loan.id}>
                    <tr>
                      <td>{(currentPage - 1) * 15 + idx + 1}</td>
                      <td>
                        <span className="me-2">{loan.client.name}</span>
                        <Link
                          to={`/loans/${loan.id}`}
                          className="badge bg-secondary text-decoration-none"
                        >
                          {loan.loan_number ?? `#${loan.id}`}
                        </Link>
                      </td>
                      <td>{formatCurrency(loan.amount)}</td>
                      <td className="text-danger">{formatCurrency(loan.late_fees ?? 0)}</td>
                      <td className="fw-semibold">{formatCurrency(loan.total_outstanding ?? 0)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0"
                          onClick={() => toggleExpand(loan.id)}
                        >
                          {loan.overdue_installments.length}{' '}
                          <i
                            className={`fa-solid fa-chevron-${expanded.has(loan.id) ? 'up' : 'down'}`}
                          />
                        </button>
                      </td>
                    <td>
                      {loan.max_days_overdue !== undefined
                        ? `${loan.max_days_overdue} days`
                        : '—'}
                    </td>
                    <td>
                      {loan.risk_level ? (
                        <span
                          className={`badge bg-${RISK_COLORS[loan.risk_level] ?? 'secondary'}`}
                        >
                          {loan.risk_level}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-2 align-items-center">
                        {loan.collection_status ? (
                          <StatusBadge status={loan.collection_status} />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 'auto' }}
                          value={loan.collection_status ?? ''}
                          onChange={(e) =>
                            handleStatusChange(loan.id, e.target.value)
                          }
                        >
                          <option value="">Set status</option>
                          {(
                            Object.entries(COLLECTION_STATUS_LABELS) as [
                              CollectionStatus,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-2 align-items-center">
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleOpenProcess(loan)}
                            disabled={actionLoading}
                          >
                            Process
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleUndo(loan)}
                            disabled={actionLoading}
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </td>
                    </tr>
                    {expanded.has(loan.id) && (
                      <tr>
                        <td colSpan={10} className="bg-light">
                          {loan.overdue_installments.length > 0 ? (
                            <table className="table table-sm mb-0">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Due Date</th>
                                  <th className="text-end">Amount</th>
                                  <th className="text-end">Paid</th>
                                  <th className="text-end">Waived</th>
                                  <th className="text-end">Past Due</th>
                                  <th>Days Overdue</th>
                                  <th>Late Fees</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loan.overdue_installments.map((inst) => (
                                  <InstallmentWaiverRow
                                    key={inst.id}
                                    installment={inst}
                                    loading={actionLoading}
                                    canEdit={canManage}
                                    onSaveFee={(installment, amount) =>
                                      handleSaveFee(loan.id, installment, amount)
                                    }
                                  />
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <span className="text-muted">No overdue installments</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {confirmAction && (
        <ConfirmModal
          show={showConfirmModal}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmVariant={confirmAction.confirmVariant ?? 'warning'}
          confirmLabel={confirmAction.confirmLabel ?? 'Apply Fees'}
          onConfirm={async () => {
            await confirmAction.onConfirm();
            setShowConfirmModal(false);
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      <ProcessPastDueModal
        show={processLoan !== null}
        loan={processLoan}
        defaultFee={defaultFee}
        loading={actionLoading}
        onConfirm={handleProcessConfirm}
        onCancel={() => setProcessLoan(null)}
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
