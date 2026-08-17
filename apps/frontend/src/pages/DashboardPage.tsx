import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardData, DashboardSummary, Loan } from '@/types';
import { getDashboard } from '@/services/dashboardService';
import { getLoans } from '@/services/loanService';
import { StatusBadge } from '@/components/StatusBadge';
import CollectionChart from '@/components/CollectionChart';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

interface StatCardProps {
  value: string | number;
  label: string;
  icon: string;
  color: string;
  linkTo?: string;
}

function StatCard({ value, label, icon, color, linkTo }: StatCardProps) {
  const content = (
    <div className="ala-dash-stat">
      <div className="ala-dash-stat-icon" style={{ backgroundColor: `${color}15`, color }}>
        <i className={icon} />
      </div>
      <div>
        <div className="ala-dash-stat-value">{value}</div>
        <div className="ala-dash-stat-label">{label}</div>
      </div>
    </div>
  );
  return linkTo ? <Link to={linkTo} className="text-decoration-none">{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const roleSlug = user?.role?.slug ?? '';

  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingLoans, setPendingLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, pending] = await Promise.all([
        getDashboard(),
        roleSlug === 'approver' || roleSlug === 'administrator'
          ? getLoans({ application_status: 'submitted,under_review', per_page: 10 })
          : Promise.resolve(null),
      ]);
      setData(dashboard);
      if (pending) setPendingLoans(pending.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [roleSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="text-center py-5" style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-sm)' }}>No dashboard data available.</div>;

  const { summary, recent_loans, upcoming_due } = data;

  const statRow = (cards: StatCardProps[]) => (
    <div className="ala-dash-stats">
      {cards.map((c, i) => (
        <StatCard key={i} {...c} />
      ))}
    </div>
  );

  const roleLabel = user?.role?.name ?? 'Dashboard';
  const roleSubtitles: Record<string, string> = {
    administrator: 'Full system access',
    loan_officer: 'Borrower management & loan origination',
    approver: 'Loan approval workflow',
    cashier: 'Loan release & payment processing',
    collector: 'Delinquency follow-up & collections',
    auditor: 'Read-only transaction monitoring',
    borrower: 'Your loans & payment history',
  };

  const renderRecentLoans = () => (
    <div className="ala-card">
      <div className="d-flex justify-content-between align-items-center" style={{ padding: 'var(--ala-space-5) var(--ala-space-5) var(--ala-space-3)' }}>
        <h5 className="fw-semibold mb-0" style={{ fontSize: 'var(--ala-text-lg)' }}>Recent Loans</h5>
        <Link to="/loans" className="btn btn-sm btn-outline-primary">View All</Link>
      </div>
      {recent_loans.length === 0 ? (
        <div style={{ padding: 'var(--ala-space-6)', textAlign: 'center', color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-sm)' }}>
          No recent loan activity
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Borrower</th>
                <th className="text-end">Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent_loans.slice(0, 5).map((loan, i) => (
                <tr key={loan.id}>
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    <Link to={`/loans/${loan.id}`} className="fw-medium">
                      {loan.client?.name ?? `#${loan.client_id}`}
                    </Link>
                  </td>
                  <td className="text-end font-monospace">{formatCurrency(loan.amount)}</td>
                  <td>
                    <StatusBadge status={loan.loan_status ?? loan.application_status} />
                  </td>
                  <td className="text-nowrap">{formatDate(loan.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderUpcomingDue = () => (
    <div className="ala-card">
      <div className="d-flex justify-content-between align-items-center" style={{ padding: 'var(--ala-space-5) var(--ala-space-5) var(--ala-space-3)' }}>
        <h5 className="fw-semibold mb-0" style={{ fontSize: 'var(--ala-text-lg)' }}>Due This Week</h5>
        <Link to="/loans" className="btn btn-sm btn-outline-primary">View All</Link>
      </div>
      {upcoming_due.length === 0 ? (
        <div style={{ padding: 'var(--ala-space-6)', textAlign: 'center', color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-sm)' }}>
          No upcoming due dates
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>#</th>
                <th className="text-end">Amount</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {upcoming_due.slice(0, 5).map((item) => (
                <tr key={item.installment_id}>
                  <td>
                    <Link to={`/loans/${item.loan_id}`} className="fw-medium">
                      {item.client_name}
                    </Link>
                  </td>
                  <td>{item.installment_number}</td>
                  <td className="text-end font-monospace">{formatCurrency(item.amount)}</td>
                  <td className="text-nowrap">{formatDate(item.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPendingApproval = () => (
    <div className="ala-card">
      <div className="d-flex justify-content-between align-items-center" style={{ padding: 'var(--ala-space-5) var(--ala-space-5) var(--ala-space-3)' }}>
        <h5 className="fw-semibold mb-0" style={{ fontSize: 'var(--ala-text-lg)' }}>Pending Approval</h5>
        {pendingLoans.length > 0 && (
          <Link to="/loans/approve" className="btn btn-sm btn-outline-primary">
            Review ({pendingLoans.length})
          </Link>
        )}
      </div>
      {pendingLoans.length === 0 ? (
        <div style={{ padding: 'var(--ala-space-6)', textAlign: 'center', color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-sm)' }}>
          No pending applications
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Borrower</th>
                <th className="text-end">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingLoans.slice(0, 5).map((loan) => (
                <tr key={loan.id}>
                  <td className="fw-medium">{loan.id}</td>
                  <td>
                    <Link to={`/loans/${loan.id}`} className="fw-medium">
                      {loan.client?.name ?? `Client #${loan.client_id}`}
                    </Link>
                  </td>
                  <td className="text-end font-monospace">{formatCurrency(loan.amount)}</td>
                  <td><StatusBadge status={loan.application_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderQuickActions = (actions: { to: string; icon: string; label: string; color: string }[]) => (
    <div className="ala-card">
      <div style={{ padding: 'var(--ala-space-5) var(--ala-space-5) var(--ala-space-3)' }}>
        <h5 className="fw-semibold mb-0" style={{ fontSize: 'var(--ala-text-lg)' }}>Quick Actions</h5>
      </div>
      <div style={{ padding: '0 var(--ala-space-5) var(--ala-space-5)' }}>
        <div className="d-grid gap-2">
          {actions.map((a, i) => (
            <Link key={i} to={a.to} className="btn btn-outline-secondary d-flex align-items-center gap-2 py-2">
              <i className={`${a.icon} fs-6`} style={{ color: a.color, width: 20, textAlign: 'center' }} />
              <span>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChart = (data: DashboardSummary) => (
    <div className="ala-card">
      <div style={{ padding: 'var(--ala-space-5)' }}>
        <h5 className="fw-semibold mb-4" style={{ fontSize: 'var(--ala-text-lg)' }}>Portfolio Overview</h5>
        <CollectionChart
          title=""
          data={[
            { label: 'Active', value: data.active_loans },
            { label: 'Completed', value: data.completed_loans },
            { label: 'Defaulted', value: data.defaulted_loans },
            { label: 'Pending', value: data.pending_applications },
          ]}
        />
      </div>
    </div>
  );

  const renderBreakdown = (title: string, items: { label: string; value: number; color: string }[]) => (
    <div className="ala-card">
      <div style={{ padding: 'var(--ala-space-5)' }}>
        <h5 className="fw-semibold mb-3" style={{ fontSize: 'var(--ala-text-lg)' }}>{title}</h5>
        {items.map((item, i) => (
          <div key={i} className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
              <span style={{ fontSize: 'var(--ala-text-sm)', color: 'var(--ala-gray-700)' }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 600, color: 'var(--ala-gray-800)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNote = (text: string) => (
    <div className="alert alert-info d-flex align-items-center">
      <i className="fa-solid fa-circle-info me-2" />
      {text}
    </div>
  );

  const dashboardGreeting = (
    <div style={{ marginBottom: 'var(--ala-space-6)' }}>
      <h1 style={{ fontSize: 'var(--ala-text-4xl)', fontWeight: 700, margin: 0 }}>
        Welcome, {user?.name ?? 'User'}
      </h1>
      <p style={{ margin: '0.25rem 0 0', fontSize: 'var(--ala-text-sm)', color: 'var(--ala-gray-500)' }}>
        {roleSubtitles[roleSlug] ?? 'Loan Management System'}{' '}
        <span style={{
          display: 'inline-block',
          padding: '0.125rem 0.5rem',
          borderRadius: '9999px',
          backgroundColor: 'var(--ala-gray-100)',
          color: 'var(--ala-gray-600)',
          fontSize: 'var(--ala-text-xs)',
          fontWeight: 500,
          verticalAlign: 'middle',
        }}>
          {roleLabel}
        </span>
      </p>
    </div>
  );

  const colors = {
    primary: 'var(--ala-blue-700)',
    success: 'var(--ala-success-600)',
    warning: 'var(--ala-warning-600)',
    danger: 'var(--ala-danger-600)',
    info: 'var(--ala-info-600)',
    dark: 'var(--ala-gray-700)',
  };

  switch (roleSlug) {
    case 'administrator':
      return (
        <div>
          {dashboardGreeting}
          {statRow([
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.primary, linkTo: '/loans' },
            { value: formatCurrency(summary.total_collections), label: 'Total Collections', icon: 'fa-solid fa-peso-sign', color: colors.success },
            { value: summary.pending_applications, label: 'Pending Approval', icon: 'fa-solid fa-hourglass-half', color: colors.warning, linkTo: '/loans/approve' },
            { value: summary.overdue_installments, label: 'Overdue', icon: 'fa-solid fa-clock', color: colors.danger, linkTo: '/past-due' },
            { value: summary.total_clients, label: 'Clients', icon: 'fa-solid fa-users', color: colors.info, linkTo: '/clients' },
          ])}
          <div className="row g-4 mb-4">
            <div className="col-lg-4">{renderChart(summary)}</div>
            <div className="col-lg-4">{renderPendingApproval()}</div>
            <div className="col-lg-4">
              {renderQuickActions([
                { to: '/clients', icon: 'fa-solid fa-user-plus', label: 'Manage Borrowers', color: colors.primary },
                { to: '/loans/calculator', icon: 'fa-solid fa-calculator', label: 'Loan Calculator', color: colors.success },
                { to: '/loans/approve', icon: 'fa-solid fa-clipboard-check', label: 'Review Approvals', color: colors.warning },
                { to: '/reports', icon: 'fa-solid fa-chart-bar', label: 'View Reports', color: colors.info },
                { to: '/payments', icon: 'fa-solid fa-money-bill-wave', label: 'Record Payment', color: colors.success },
                { to: '/users', icon: 'fa-solid fa-users-gear', label: 'User Management', color: colors.dark },
              ])}
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-6">{renderRecentLoans()}</div>
            <div className="col-md-6">{renderUpcomingDue()}</div>
          </div>
        </div>
      );

    case 'loan_officer':
      return (
        <div>
          {dashboardGreeting}
          {statRow([
            { value: summary.total_clients, label: 'My Clients', icon: 'fa-solid fa-users', color: colors.primary, linkTo: '/clients' },
            { value: summary.pending_applications, label: 'Pending Review', icon: 'fa-solid fa-hourglass-half', color: colors.warning },
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.info, linkTo: '/loans' },
            { value: summary.overdue_installments, label: 'Overdue', icon: 'fa-solid fa-clock', color: colors.danger, linkTo: '/past-due' },
          ])}
          <div className="row g-4 mb-4">
            <div className="col-lg-4">
              {renderQuickActions([
                { to: '/clients/new', icon: 'fa-solid fa-user-plus', label: 'Register Borrower', color: colors.primary },
                { to: '/loans/calculator', icon: 'fa-solid fa-calculator', label: 'New Loan', color: colors.success },
                { to: '/reloan', icon: 'fa-solid fa-rotate', label: 'Process Reloan', color: colors.warning },
                { to: '/clients', icon: 'fa-solid fa-address-book', label: 'View Borrowers', color: colors.info },
              ])}
            </div>
            <div className="col-lg-4">{renderPendingApproval()}</div>
            <div className="col-lg-4">
              {renderBreakdown('Loan Summary', [
                { label: 'Active Loans', value: summary.active_loans, color: colors.success },
                { label: 'Due Today', value: summary.due_installments, color: colors.warning },
                { label: 'Overdue', value: summary.overdue_installments, color: colors.danger },
                { label: 'Completed', value: summary.completed_loans, color: colors.primary },
              ])}
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-6">{renderRecentLoans()}</div>
            <div className="col-md-6">{renderUpcomingDue()}</div>
          </div>
        </div>
      );

    case 'approver':
      return (
        <div>
          {dashboardGreeting}
          {statRow([
            { value: summary.pending_applications, label: 'Pending Approval', icon: 'fa-solid fa-hourglass-half', color: colors.warning, linkTo: '/loans/approve' },
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.info, linkTo: '/loans' },
            { value: summary.total_clients, label: 'Clients', icon: 'fa-solid fa-users', color: colors.primary, linkTo: '/clients' },
            { value: summary.overdue_installments, label: 'Overdue', icon: 'fa-solid fa-clock', color: colors.danger, linkTo: '/past-due' },
          ])}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">{renderPendingApproval()}</div>
            <div className="col-lg-3">
              {renderQuickActions([
                { to: '/loans/approve', icon: 'fa-solid fa-clipboard-check', label: 'Review Applications', color: colors.warning },
                { to: '/clients', icon: 'fa-solid fa-address-book', label: 'View Borrowers', color: colors.info },
              ])}
            </div>
            <div className="col-lg-3">
              {renderBreakdown('Overview', [
                { label: 'Pending', value: summary.pending_applications, color: colors.warning },
                { label: 'Active', value: summary.active_loans, color: colors.success },
                { label: 'Due Today', value: summary.due_installments, color: colors.warning },
                { label: 'Overdue', value: summary.overdue_installments, color: colors.danger },
              ])}
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-6">{renderRecentLoans()}</div>
            <div className="col-md-6">{renderUpcomingDue()}</div>
          </div>
        </div>
      );

    case 'cashier':
      return (
        <div>
          {dashboardGreeting}
          {statRow([
            { value: formatCurrency(summary.total_collections), label: 'Total Collected', icon: 'fa-solid fa-peso-sign', color: colors.success },
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.primary, linkTo: '/loans' },
            { value: summary.due_installments, label: 'Due Today', icon: 'fa-solid fa-calendar-day', color: colors.warning },
            { value: summary.overdue_installments, label: 'Overdue', icon: 'fa-solid fa-clock', color: colors.danger },
          ])}
          <div className="alert alert-info d-flex align-items-center mt-3">
            <i className="fa-solid fa-circle-info me-3" style={{ fontSize: '1.25rem' }} />
            <div>
              <strong>Total Expected:</strong> {formatCurrency(summary.total_expected_repayments)}
              <span className="mx-2">|</span>
              <strong>Late Fees:</strong> {formatCurrency(summary.total_late_fees)}
            </div>
          </div>
          <div className="row g-4">
            <div className="col-lg-4">
              {renderQuickActions([
                { to: '/payments', icon: 'fa-solid fa-money-bill-wave', label: 'View Payments', color: colors.success },
                { to: '/payments', icon: 'fa-solid fa-circle-plus', label: 'Record Payment', color: colors.primary },
                { to: '/refunds', icon: 'fa-solid fa-hand-holding-dollar', label: 'Refunds', color: colors.warning },
              ])}
            </div>
            <div className="col-lg-4">{renderUpcomingDue()}</div>
            <div className="col-lg-4">
              {renderBreakdown('Payment Metrics', [
                { label: 'Total Collections', value: summary.total_collections, color: colors.success },
                { label: 'Expected Repayments', value: summary.total_expected_repayments, color: colors.primary },
                { label: 'Late Fees', value: summary.total_late_fees, color: colors.danger },
                { label: 'Overdue Count', value: summary.overdue_installments, color: colors.warning },
              ])}
            </div>
          </div>
          <div className="row g-4 mt-4">
            <div className="col-12">{renderRecentLoans()}</div>
          </div>
        </div>
      );

    case 'collector':
      return (
        <div>
          {dashboardGreeting}
          {renderNote('Late fees of PHP 500 per overdue installment are applied monthly via the Past Due page.')}
          {statRow([
            { value: summary.overdue_installments, label: 'Overdue', icon: 'fa-solid fa-circle-exclamation', color: colors.danger, linkTo: '/past-due' },
            { value: formatCurrency(summary.total_late_fees), label: 'Late Fees', icon: 'fa-solid fa-circle-dollar', color: colors.danger },
            { value: summary.defaulted_loans, label: 'Defaulted', icon: 'fa-solid fa-triangle-exclamation', color: colors.dark, linkTo: '/past-due' },
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.primary, linkTo: '/loans' },
          ])}
          <div className="row g-4">
            <div className="col-lg-4">
              {renderQuickActions([
                { to: '/past-due', icon: 'fa-solid fa-list-check', label: 'View Past Due Loans', color: colors.danger },
                { to: '/loans', icon: 'fa-solid fa-search', label: 'Search Loans', color: colors.primary },
              ])}
            </div>
            <div className="col-lg-4">{renderUpcomingDue()}</div>
            <div className="col-lg-4">
              {renderBreakdown('Delinquency Overview', [
                { label: 'Overdue', value: summary.overdue_installments, color: colors.danger },
                { label: 'Due Today', value: summary.due_installments, color: colors.warning },
                { label: 'Late Fees', value: summary.total_late_fees, color: colors.dark },
                { label: 'Defaulted', value: summary.defaulted_loans, color: 'var(--ala-gray-500)' },
              ])}
            </div>
          </div>
        </div>
      );

    case 'auditor':
      return (
        <div>
          {dashboardGreeting}
          {renderNote('Auditor role: read-only access to all transactions and audit logs.')}
          {statRow([
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.primary, linkTo: '/loans' },
            { value: formatCurrency(summary.total_collections), label: 'Total Collections', icon: 'fa-solid fa-peso-sign', color: colors.success },
            { value: summary.total_clients, label: 'Clients', icon: 'fa-solid fa-users', color: colors.info, linkTo: '/clients' },
            { value: summary.overdue_installments, label: 'Overdue', icon: 'fa-solid fa-clock', color: colors.danger },
            { value: summary.pending_applications, label: 'Pending', icon: 'fa-solid fa-hourglass-half', color: colors.warning },
          ])}
          <div className="row g-4">
            <div className="col-md-4">{renderChart(summary)}</div>
            <div className="col-md-4">{renderRecentLoans()}</div>
            <div className="col-md-4">{renderUpcomingDue()}</div>
          </div>
        </div>
      );

    case 'borrower':
      return (
        <div>
          {dashboardGreeting}
          {statRow([
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.primary, linkTo: '/loans' },
            { value: summary.due_installments, label: 'Due Soon', icon: 'fa-solid fa-calendar-day', color: colors.warning },
          ])}
          <div className="row g-4">
            <div className="col-md-6">
              {renderQuickActions([
                { to: '/loans', icon: 'fa-solid fa-file-invoice', label: 'My Loans', color: colors.primary },
                { to: '/payments', icon: 'fa-solid fa-money-bill-wave', label: 'View Payments', color: colors.success },
              ])}
            </div>
            <div className="col-md-6">{renderUpcomingDue()}</div>
          </div>
        </div>
      );

    default:
      return (
        <div>
          {dashboardGreeting}
          {statRow([
            { value: summary.active_loans, label: 'Active Loans', icon: 'fa-solid fa-file-invoice', color: colors.primary },
            { value: formatCurrency(summary.total_collections), label: 'Total Collections', icon: 'fa-solid fa-peso-sign', color: colors.success },
            { value: summary.pending_applications, label: 'Pending', icon: 'fa-solid fa-hourglass-half', color: colors.warning },
            { value: summary.overdue_installments, label: 'Overdue', icon: 'fa-solid fa-clock', color: colors.danger },
          ])}
          <div className="row g-4">
            <div className="col-md-6">{renderRecentLoans()}</div>
            <div className="col-md-6">{renderUpcomingDue()}</div>
          </div>
        </div>
      );
  }
}
