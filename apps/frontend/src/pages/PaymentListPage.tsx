import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLoans } from '@/services/loanService';
import { getPaymentSummary, type PaymentSummary } from '@/services/paymentService';
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import type { Loan, Payment, PaginatedResponse } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getMethodBadgeColor(method: string): string {
  const m = method.toLowerCase();
  if (m === 'cash') return 'var(--ala-gray-600)';
  if (m === 'gcash') return 'var(--ala-blue-700)';
  if (m === 'bpi') return 'var(--ala-blue-700)';
  if (m === 'bdo') return 'var(--ala-success-600)';
  return 'var(--ala-warning-600)';
}

const HISTORY_PER_PAGE = 15;

export function PaymentListPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summaries, setSummaries] = useState<Map<number, PaymentSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result: PaginatedResponse<Loan> = await getLoans({
        loan_status: 'active,past_due,delinquent',
        per_page: 50,
        page: 1,
      });

      setLoans(result.data);

      const summaryMap = new Map<number, PaymentSummary>();
      const summaryResults = await Promise.allSettled(
        result.data.map((loan) => getPaymentSummary(loan.id)),
      );
      summaryResults.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          summaryMap.set(result.data[i].id, res.value);
        }
      });
      setSummaries(summaryMap);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeLoanCount = loans.filter(
    (l) => l.loan_status === 'active',
  ).length;
  const pastDueCount = loans.filter(
    (l) => l.loan_status === 'past_due',
  ).length;

  let totalCollected = 0;
  let pendingCount = 0;
  const allPayments: (Payment & { client_name: string; loan_number: string | null })[] = [];

  loans.forEach((loan) => {
    const summary = summaries.get(loan.id);
    if (summary) {
      totalCollected += summary.totalPaid;
      if (summary.totalPaid === 0) {
        pendingCount++;
      }
      summary.payments.forEach((p) => {
        allPayments.push({
          ...p,
          client_name: loan.client?.name ?? `Client #${loan.client_id}`,
          loan_number: loan.loan_number ?? null,
        });
      });
    } else {
      pendingCount++;
    }
  });

  allPayments.sort(
    (a, b) =>
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
  );

  const historyTotalPages = Math.max(
    1,
    Math.ceil(allPayments.length / HISTORY_PER_PAGE),
  );
  const paginatedPayments = allPayments.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE,
  );

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
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
      <PageHeader
        title="Payments"
        breadcrumbs={[{ label: 'Payments' }]}
      />
      <p style={{ color: 'var(--ala-gray-600)', fontSize: 'var(--ala-text-sm)', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        {today}
      </p>

      <div className="ala-stats-row">
        <div className="ala-stat-card">
          <div className="ala-stat-icon" style={{ backgroundColor: 'var(--ala-success-50)', color: 'var(--ala-success-600)' }}>
            <i className="fa-solid fa-peso-sign" />
          </div>
          <div>
            <div className="ala-stat-value">{formatCurrency(totalCollected)}</div>
            <div className="ala-stat-label">Total Collected</div>
          </div>
        </div>
        <div className="ala-stat-card">
          <div className="ala-stat-icon" style={{ backgroundColor: 'var(--ala-blue-50)', color: 'var(--ala-blue-700)' }}>
            <i className="fa-solid fa-file-invoice" />
          </div>
          <div>
            <div className="ala-stat-value">{activeLoanCount}</div>
            <div className="ala-stat-label">Active Loans</div>
          </div>
        </div>
        <div className="ala-stat-card">
          <div className="ala-stat-icon" style={{ backgroundColor: 'var(--ala-danger-50)', color: 'var(--ala-danger-600)' }}>
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <div>
            <div className="ala-stat-value">{pastDueCount}</div>
            <div className="ala-stat-label">Past Due</div>
          </div>
        </div>
        <div className="ala-stat-card">
          <div className="ala-stat-icon" style={{ backgroundColor: 'var(--ala-warning-50)', color: 'var(--ala-warning-600)' }}>
            <i className="fa-solid fa-clock" />
          </div>
          <div>
            <div className="ala-stat-value">{pendingCount}</div>
            <div className="ala-stat-label">Pending Payments</div>
          </div>
        </div>
      </div>

      <h5 className="fw-semibold mb-3" style={{ fontSize: 'var(--ala-text-lg)' }}>Active Loans</h5>
      {loans.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-file-invoice"
          title="No active loans"
          description="No active loans with payment data available"
        />
      ) : (
        <div className="ala-card mb-4">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Loan #</th>
                  <th>Borrower</th>
                  <th className="text-end">Amount</th>
                  <th className="text-end">Paid</th>
                  <th className="text-end">Balance</th>
                  <th>Progress</th>
                  <th>Last Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan, idx) => {
                  const summary = summaries.get(loan.id);
                  const totalPaid = summary?.totalPaid ?? 0;
                  const balance = loan.amount - totalPaid;
                  const progress =
                    loan.amount > 0
                      ? Math.min(100, Math.round((totalPaid / loan.amount) * 100))
                      : 0;

                  return (
                    <tr key={loan.id}>
                      <td className="text-muted">{idx + 1}</td>
                      <td className="fw-medium">{loan.loan_number ?? loan.id}</td>
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
                      <td className="text-end font-monospace">{formatCurrency(totalPaid)}</td>
                      <td className={`text-end font-monospace ${balance > 0 ? 'text-danger' : ''}`}>
                        {formatCurrency(balance)}
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div className="ala-progress">
                          <div
                            className="ala-progress-bar"
                            style={{ width: `${progress}%` }}
                          />
                          <span className="ala-progress-label">{progress}%</span>
                        </div>
                      </td>
                      <td className="text-nowrap">{formatDate(summary?.lastPaymentDate ?? null)}</td>
                      <td>
                        <Link
                          to={`/payments/receive/${loan.id}`}
                          className="btn btn-sm btn-primary"
                        >
                          Record
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h5 className="fw-semibold mb-3" style={{ fontSize: 'var(--ala-text-lg)' }}>Payment History</h5>
      {allPayments.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-clock-rotate-left"
          title="No payment history"
          description="Payments will appear here once recorded"
        />
      ) : (
        <div className="ala-card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Loan #</th>
                  <th>Borrower</th>
                  <th className="text-end">Amount</th>
                  <th>Method</th>
                  <th>Notes</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.map((payment, idx) => (
                  <tr key={payment.id}>
                    <td className="text-muted">{(historyPage - 1) * HISTORY_PER_PAGE + idx + 1}</td>
                    <td className="text-nowrap">{formatDate(payment.payment_date)}</td>
                    <td className="fw-medium">{payment.loan_number ?? payment.loan_id}</td>
                    <td>{payment.client_name}</td>
                    <td className="text-end font-monospace">{formatCurrency(payment.amount)}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: `${getMethodBadgeColor(payment.payment_method)}15`,
                          color: getMethodBadgeColor(payment.payment_method),
                          fontSize: 'var(--ala-text-xs)',
                          fontWeight: 500,
                        }}
                      >
                        {payment.payment_method}
                      </span>
                    </td>
                    <td>{payment.notes || <span className="text-muted">—</span>}</td>
                    <td>
                      {payment.proof_image ? (
                        <a
                          href={payment.proof_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0 var(--ala-space-5) var(--ala-space-5)' }}>
            <Pagination
              currentPage={historyPage}
              lastPage={historyTotalPages}
              onPageChange={setHistoryPage}
            />
          </div>
        </div>
      )}

      <style>{`
        .ala-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--ala-space-4);
          margin-bottom: var(--ala-space-6);
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
        .ala-progress {
          height: 6px;
          background: var(--ala-gray-200);
          border-radius: 3px;
          position: relative;
        }
        .ala-progress-bar {
          height: 100%;
          background: var(--ala-blue-700);
          border-radius: 3px;
          transition: width var(--ala-transition-normal);
        }
        .ala-progress-label {
          font-size: var(--ala-text-xs);
          color: var(--ala-gray-600);
          font-weight: 500;
          margin-top: 2px;
          display: block;
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
      `}</style>
    </div>
  );
}
