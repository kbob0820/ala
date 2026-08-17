import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ReportFilters } from '@/components/ReportFilters';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import CollectionChart from '@/components/CollectionChart';
import {
  generateDailyCollections,
  generateMonthlyCollections,
  generateAgingReport,
  generateLoanLedger,
  generateBorrowerSummary,
} from '@/services/reportService';
import type {
  DailyCollection,
  MonthlyCollection,
  AgingBucket,
  LoanLedgerEntry,
  BorrowerSummary,
} from '@/services/reportService';
import { getLoans } from '@/services/loanService';
import type { Loan } from '@/types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
  });
}

function exportToCSV(columns: string[], rows: string[][], filename: string) {
  const csvContent = [columns, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function getDefaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

interface OutstandingLoan extends Loan {
  _daysActive: number;
  _remaining: number;
}

const DAILY_PER_PAGE = 15;
const BORROWER_PER_PAGE = 20;
const OUTSTANDING_PER_PAGE = 15;

export default function ReportsPage() {
  useAuth();

  const [activeTab, setActiveTab] = useState('daily');
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());

  const [dailyData, setDailyData] = useState<DailyCollection[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState('');
  const [dailyPage, setDailyPage] = useState(1);

  const [monthlyData, setMonthlyData] = useState<MonthlyCollection[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState('');

  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [agingLoading, setAgingLoading] = useState(false);
  const [agingError, setAgingError] = useState('');

  const [ledgerInputId, setLedgerInputId] = useState('');
  const [ledgerData, setLedgerData] = useState<LoanLedgerEntry[] | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerNotFound, setLedgerNotFound] = useState(false);

  const [borrowerData, setBorrowerData] = useState<BorrowerSummary[]>([]);
  const [borrowerLoading, setBorrowerLoading] = useState(false);
  const [borrowerError, setBorrowerError] = useState('');
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [borrowerSort, setBorrowerSort] = useState<{
    field: keyof BorrowerSummary;
    direction: 'asc' | 'desc';
  }>({ field: 'outstandingBalance', direction: 'desc' });
  const [borrowerPage, setBorrowerPage] = useState(1);

  const [outstandingData, setOutstandingData] = useState<OutstandingLoan[]>([]);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [outstandingError, setOutstandingError] = useState('');
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [outstandingLastPage, setOutstandingLastPage] = useState(1);

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    setDailyError('');
    try {
      const data = await generateDailyCollections(dateFrom, dateTo);
      setDailyData(data);
      setDailyPage(1);
    } catch (err) {
      setDailyError(err instanceof Error ? err.message : 'Failed to load daily collections.');
    } finally {
      setDailyLoading(false);
    }
  }, [dateFrom, dateTo]);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    setMonthlyError('');
    try {
      const data = await generateMonthlyCollections(12);
      setMonthlyData(data);
    } catch (err) {
      setMonthlyError(err instanceof Error ? err.message : 'Failed to load monthly collections.');
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  const loadAging = useCallback(async () => {
    setAgingLoading(true);
    setAgingError('');
    try {
      const data = await generateAgingReport();
      setAgingData(data);
    } catch (err) {
      setAgingError(err instanceof Error ? err.message : 'Failed to load aging report.');
    } finally {
      setAgingLoading(false);
    }
  }, []);

  const handleGenerateLedger = async () => {
    const id = parseInt(ledgerInputId, 10);
    if (!id) return;
    setLedgerLoading(true);
    setLedgerError('');
    setLedgerNotFound(false);
    setLedgerData(null);
    try {
      const data = await generateLoanLedger(id);
      if (data === null) {
        setLedgerNotFound(true);
      } else {
        setLedgerData(data);
      }
    } catch (err) {
      setLedgerError(err instanceof Error ? err.message : 'Failed to load loan ledger.');
    } finally {
      setLedgerLoading(false);
    }
  };

  const loadBorrowerSummary = useCallback(async () => {
    setBorrowerLoading(true);
    setBorrowerError('');
    try {
      const data = await generateBorrowerSummary();
      setBorrowerData(data);
      setBorrowerPage(1);
    } catch (err) {
      setBorrowerError(err instanceof Error ? err.message : 'Failed to load borrower summary.');
    } finally {
      setBorrowerLoading(false);
    }
  }, []);

  const loadOutstanding = useCallback(async (page = 1) => {
    setOutstandingLoading(true);
    setOutstandingError('');
    try {
      const result = await getLoans({
        loan_status: 'active,past_due,delinquent',
        per_page: OUTSTANDING_PER_PAGE,
        page,
      });
      const now = Date.now();
      const enhanced: OutstandingLoan[] = result.data.map((l) => ({
        ...l,
        _remaining: l.remaining_balance ?? l.amount,
        _daysActive: l.released_at
          ? Math.floor((now - new Date(l.released_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      }));
      setOutstandingData(enhanced);
      setOutstandingPage(result.meta.current_page);
      setOutstandingLastPage(result.meta.last_page);
    } catch (err) {
      setOutstandingError(err instanceof Error ? err.message : 'Failed to load outstanding loans.');
    } finally {
      setOutstandingLoading(false);
    }
  }, []);

  useEffect(() => {
    switch (activeTab) {
      case 'daily':
        loadDaily();
        break;
      case 'monthly':
        loadMonthly();
        break;
      case 'aging':
        loadAging();
        break;
      case 'borrower':
        loadBorrowerSummary();
        break;
      case 'outstanding':
        loadOutstanding();
        break;
    }
  }, [activeTab, loadDaily, loadMonthly, loadAging, loadBorrowerSummary, loadOutstanding]);

  const handleRefresh = () => {
    switch (activeTab) {
      case 'daily':
        loadDaily();
        break;
      case 'monthly':
        loadMonthly();
        break;
      case 'aging':
        loadAging();
        break;
      case 'borrower':
        loadBorrowerSummary();
        break;
      case 'outstanding':
        loadOutstanding(outstandingPage);
        break;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    switch (activeTab) {
      case 'daily':
        exportToCSV(
          ['Date', '# Transactions', 'Total (PHP)', 'Cash (PHP)', 'GCash (PHP)', 'BPI (PHP)', 'BDO (PHP)', 'Other (PHP)'],
          dailyData.map((d) => [d.date, String(d.count), String(d.total), String(d.cash), String(d.gcash), String(d.bpi), String(d.bdo), String(d.other)]),
          `daily-collections-${today}.csv`,
        );
        break;
      case 'monthly':
        exportToCSV(
          ['Month', '# Transactions', 'Total (PHP)'],
          monthlyData.map((d) => [d.month, String(d.count), String(d.total)]),
          `monthly-collections-${today}.csv`,
        );
        break;
      case 'aging':
        exportToCSV(
          ['Bucket', '# Loans', 'Outstanding Amount (PHP)'],
          agingData.map((d) => [d.label, String(d.count), String(d.amount)]),
          `aging-report-${today}.csv`,
        );
        break;
      case 'borrower':
        exportToCSV(
          ['Borrower', 'Total Loans', 'Borrowed (PHP)', 'Paid (PHP)', 'Outstanding (PHP)', 'Active', 'Completed', 'Defaulted'],
          borrowerData.map((d) => [
            d.clientName,
            String(d.totalLoans),
            String(d.totalBorrowed),
            String(d.totalPaid),
            String(d.outstandingBalance),
            String(d.activeLoans),
            String(d.completedLoans),
            String(d.defaultedLoans),
          ]),
          `borrower-summary-${today}.csv`,
        );
        break;
      case 'outstanding':
        exportToCSV(
          ['Loan #', 'Borrower', 'Amount (PHP)', 'Remaining (PHP)', 'Status', 'Released Date', 'Days Active'],
          outstandingData.map((l) => [
            String(l.loan_number ?? l.id),
            l.client?.name ?? `Client #${l.client_id}`,
            String(l.amount),
            String(l._remaining),
            l.loan_status ?? '',
            l.released_at ?? '',
            String(l._daysActive),
          ]),
          `outstanding-loans-${today}.csv`,
        );
        break;
      case 'ledger':
        if (ledgerData) {
          exportToCSV(
            ['Date', 'Description', 'Debit (PHP)', 'Credit (PHP)', 'Balance (PHP)'],
            ledgerData.map((e) => [e.date, e.description, String(e.debit), String(e.credit), String(e.balance)]),
            `loan-ledger-${ledgerInputId}-${today}.csv`,
          );
        }
        break;
    }
  };

  const dailyTotalPages = Math.ceil(dailyData.length / DAILY_PER_PAGE);
  const dailyPaged = dailyData.slice((dailyPage - 1) * DAILY_PER_PAGE, dailyPage * DAILY_PER_PAGE);

  const filteredBorrowers = borrowerData.filter((b) =>
    b.clientName.toLowerCase().includes(borrowerSearch.toLowerCase()),
  );
  const sortedBorrowers = [...filteredBorrowers].sort((a, b) => {
    const aVal = a[borrowerSort.field];
    const bVal = b[borrowerSort.field];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return borrowerSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return borrowerSort.direction === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });
  const borrowerTotalPages = Math.ceil(sortedBorrowers.length / BORROWER_PER_PAGE);
  const borrowerPaged = sortedBorrowers.slice(
    (borrowerPage - 1) * BORROWER_PER_PAGE,
    borrowerPage * BORROWER_PER_PAGE,
  );

  const handleBorrowerSort = (field: keyof BorrowerSummary) => {
    setBorrowerSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
    setBorrowerPage(1);
  };

  const sortIcon = (field: keyof BorrowerSummary) => {
    if (borrowerSort.field !== field) return '';
    return borrowerSort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const dailyTotalCollected = dailyData.reduce((s, d) => s + d.total, 0);
  const dailyTotalTransactions = dailyData.reduce((s, d) => s + d.count, 0);
  const dailyAvgPerTx = dailyTotalTransactions > 0 ? dailyTotalCollected / dailyTotalTransactions : 0;
  const dailyActiveDays = dailyData.length;

  const monthlyTotalCollected = monthlyData.reduce((s, d) => s + d.total, 0);
  const monthlyAvg = monthlyData.length > 0 ? monthlyTotalCollected / monthlyData.length : 0;
  const monthlyBestMonth =
    monthlyData.length > 0
      ? monthlyData.reduce((best, d) => (d.total > best.total ? d : best), monthlyData[0])
      : null;

  const agingTotalOutstanding = agingData.reduce((s, b) => s + b.amount, 0);
  const agingDelinquentCount = agingData
    .filter((b) => b.minDays >= 31)
    .reduce((s, b) => s + b.count, 0);
  const avgDaysTotal = agingData.reduce((s, b) => s + b.minDays * b.count, 0);
  const avgDaysCount = agingData.reduce((s, b) => s + b.count, 0);
  const agingAvgDays = avgDaysCount > 0 ? Math.round(avgDaysTotal / avgDaysCount) : 0;

  const borrowerTotalBorrowers = borrowerData.length;
  const borrowerTotalBorrowed = borrowerData.reduce((s, b) => s + b.totalBorrowed, 0);
  const borrowerTotalPaid = borrowerData.reduce((s, b) => s + b.totalPaid, 0);
  const borrowerTotalOutstanding = borrowerData.reduce((s, b) => s + b.outstandingBalance, 0);

  const outstandingActive = outstandingData.filter((l) => l.loan_status === 'active').length;
  const outstandingPastDue = outstandingData.filter(
    (l) => l.loan_status === 'past_due' || l.loan_status === 'delinquent',
  ).length;
  const outstandingTotalAmount = outstandingData.reduce(
    (s, l) => s + l._remaining,
    0,
  );
  const outstandingAvgAmount =
    outstandingData.length > 0 ? outstandingTotalAmount / outstandingData.length : 0;


  const isOverallLoading =
    activeTab === 'daily'
      ? dailyLoading
      : activeTab === 'monthly'
        ? monthlyLoading
        : activeTab === 'aging'
          ? agingLoading
          : activeTab === 'borrower'
            ? borrowerLoading
            : activeTab === 'outstanding'
              ? outstandingLoading
              : false;

  const agingRowClass = (minDays: number): string => {
    if (minDays === 0) return 'table-success';
    if (minDays <= 60) return 'table-warning';
    if (minDays <= 90) return 'table-danger';
    return 'table-dark';
  };

  return (
    <div className="container-fluid py-3">
      <h1 className="mb-3">Reports</h1>

      <div className="alert alert-info" role="alert">
        Reports module is a Future Phase feature. Data is computed client-side from
        available API data.
      </div>

      <ReportFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRefresh={handleRefresh}
        loading={isOverallLoading}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <ul className="ala-tabs mb-3">
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            Daily Collections
          </button>
        </li>
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            Monthly Collections
          </button>
        </li>
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'aging' ? 'active' : ''}`}
            onClick={() => setActiveTab('aging')}
          >
            Aging Report
          </button>
        </li>
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            Loan Ledger
          </button>
        </li>
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'borrower' ? 'active' : ''}`}
            onClick={() => setActiveTab('borrower')}
          >
            Borrower Summary
          </button>
        </li>
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'outstanding' ? 'active' : ''}`}
            onClick={() => setActiveTab('outstanding')}
          >
            Outstanding Loans
          </button>
        </li>
      </ul>

      {/* Daily Collections */}
      {activeTab === 'daily' && (
        <>
          {dailyLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          {dailyError && (
            <div className="alert alert-danger" role="alert">
              {dailyError}
            </div>
          )}
          {!dailyLoading && !dailyError && (
            <>
              <div className="row mb-3">
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Collected</div>
                      <div className="fs-5 fw-bold">{formatCurrency(dailyTotalCollected)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Transactions</div>
                      <div className="fs-5 fw-bold">{dailyTotalTransactions}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Avg per Transaction</div>
                      <div className="fs-5 fw-bold">{formatCurrency(dailyAvgPerTx)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Active Days</div>
                      <div className="fs-5 fw-bold">{dailyActiveDays}</div>
                    </div>
                  </div>
                </div>
              </div>

              <CollectionChart
                data={dailyData.map((d) => ({ label: formatDate(d.date), value: d.total }))}
                title="Daily Collection Totals"
              />

              {dailyPaged.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No daily collection data available.
                </div>
              ) : (
                <>
                  <div className="table-responsive mt-3">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th className="text-end"># Transactions</th>
                          <th className="text-end">Total (PHP)</th>
                          <th className="text-end">Cash (PHP)</th>
                          <th className="text-end">GCash (PHP)</th>
                          <th className="text-end">BPI (PHP)</th>
                          <th className="text-end">BDO (PHP)</th>
                          <th className="text-end">Other (PHP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyPaged.map((d) => (
                          <tr key={d.date}>
                            <td>{formatDate(d.date)}</td>
                            <td className="text-end">{d.count}</td>
                            <td className="text-end">{formatCurrency(d.total)}</td>
                            <td className="text-end">{formatCurrency(d.cash)}</td>
                            <td className="text-end">{formatCurrency(d.gcash)}</td>
                            <td className="text-end">{formatCurrency(d.bpi)}</td>
                            <td className="text-end">{formatCurrency(d.bdo)}</td>
                            <td className="text-end">{formatCurrency(d.other)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={dailyPage}
                    lastPage={Math.max(1, dailyTotalPages)}
                    onPageChange={setDailyPage}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Monthly Collections */}
      {activeTab === 'monthly' && (
        <>
          {monthlyLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          {monthlyError && (
            <div className="alert alert-danger" role="alert">
              {monthlyError}
            </div>
          )}
          {!monthlyLoading && !monthlyError && (
            <>
              <div className="row mb-3">
                <div className="col-md-4">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Collected This Year</div>
                      <div className="fs-5 fw-bold">{formatCurrency(monthlyTotalCollected)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Best Month</div>
                      <div className="fs-5 fw-bold">
                        {monthlyBestMonth
                          ? `${formatMonth(monthlyBestMonth.month)} - ${formatCurrency(monthlyBestMonth.total)}`
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Avg Monthly</div>
                      <div className="fs-5 fw-bold">{formatCurrency(monthlyAvg)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <CollectionChart
                data={monthlyData.map((d) => ({ label: formatMonth(d.month), value: d.total }))}
                title="Monthly Collection Totals"
              />

              {monthlyData.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No monthly collection data available.
                </div>
              ) : (
                <div className="table-responsive mt-3">
                  <table className="table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="text-end"># Transactions</th>
                        <th className="text-end">Total (PHP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((d) => (
                        <tr key={d.month}>
                          <td>{formatMonth(d.month)}</td>
                          <td className="text-end">{d.count}</td>
                          <td className="text-end">{formatCurrency(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Aging Report */}
      {activeTab === 'aging' && (
        <>
          {agingLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          {agingError && (
            <div className="alert alert-danger" role="alert">
              {agingError}
            </div>
          )}
          {!agingLoading && !agingError && (
            <>
              <div className="row mb-3">
                <div className="col-md-4">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Outstanding</div>
                      <div className="fs-5 fw-bold">{formatCurrency(agingTotalOutstanding)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Delinquent Loans</div>
                      <div className="fs-5 fw-bold">{agingDelinquentCount}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Avg Days Overdue</div>
                      <div className="fs-5 fw-bold">{agingAvgDays}</div>
                    </div>
                  </div>
                </div>
              </div>

              <CollectionChart
                data={agingData.map((b) => ({ label: b.label, value: b.amount }))}
                title="Aging Report"
                color="danger"
              />

              {agingData.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No aging report data available.
                </div>
              ) : (
                <div className="table-responsive mt-3">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Bucket</th>
                        <th className="text-end"># Loans</th>
                        <th className="text-end">Outstanding Amount (PHP)</th>
                        <th className="text-end">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingData.map((b) => {
                        const pct =
                          agingTotalOutstanding > 0
                            ? ((b.amount / agingTotalOutstanding) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <tr key={b.label} className={agingRowClass(b.minDays)}>
                            <td>{b.label}</td>
                            <td className="text-end">{b.count}</td>
                            <td className="text-end">{formatCurrency(b.amount)}</td>
                            <td className="text-end">
                              <div className="d-flex align-items-center justify-content-end gap-2">
                                <span className="small">{pct}%</span>
                                <div
                                  className="progress flex-grow-1"
                                  style={{ maxWidth: '120px', height: '8px' }}
                                >
                                  <div
                                    className="progress-bar"
                                    style={{ width: `${Math.min(Number(pct), 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Loan Ledger */}
      {activeTab === 'ledger' && (
        <>
          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Loan #</label>
              <div className="d-flex gap-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter Loan #"
                  value={ledgerInputId}
                  onChange={(e) => setLedgerInputId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerateLedger();
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateLedger}
                  disabled={ledgerLoading || !ledgerInputId}
                >
                  {ledgerLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                      />
                      Loading
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
            </div>
          </div>

          {ledgerLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {ledgerError && (
            <div className="alert alert-danger" role="alert">
              {ledgerError}
            </div>
          )}

          {ledgerNotFound && (
            <div className="alert alert-warning" role="alert">
              Loan not found.
            </div>
          )}

          {!ledgerLoading && !ledgerError && !ledgerNotFound && ledgerData === null && (
            <div className="text-center text-muted py-5">
              Enter a Loan ID and click Generate to view the ledger.
            </div>
          )}

          {ledgerData && ledgerData.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th className="text-end">Debit (PHP)</th>
                    <th className="text-end">Credit (PHP)</th>
                    <th className="text-end">Balance (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.map((entry, i) => (
                    <tr key={i}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{entry.description}</td>
                      <td className="text-end text-danger">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </td>
                      <td className="text-end text-success">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </td>
                      <td className="text-end fw-bold">{formatCurrency(entry.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Borrower Summary */}
      {activeTab === 'borrower' && (
        <>
          {borrowerLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          {borrowerError && (
            <div className="alert alert-danger" role="alert">
              {borrowerError}
            </div>
          )}
          {!borrowerLoading && !borrowerError && (
            <>
              <div className="row mb-3">
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Borrowers</div>
                      <div className="fs-5 fw-bold">{borrowerTotalBorrowers}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Borrowed</div>
                      <div className="fs-5 fw-bold">{formatCurrency(borrowerTotalBorrowed)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Collected</div>
                      <div className="fs-5 fw-bold">{formatCurrency(borrowerTotalPaid)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Outstanding</div>
                      <div className="fs-5 fw-bold text-danger">
                        {formatCurrency(borrowerTotalOutstanding)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by borrower name..."
                  value={borrowerSearch}
                  onChange={(e) => {
                    setBorrowerSearch(e.target.value);
                    setBorrowerPage(1);
                  }}
                />
              </div>

              {borrowerPaged.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No borrower summary data available.
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th
                            className="cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('clientName')}
                          >
                            Borrower{sortIcon('clientName')}
                          </th>
                          <th
                            className="text-end cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('totalLoans')}
                          >
                            Total Loans{sortIcon('totalLoans')}
                          </th>
                          <th
                            className="text-end cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('totalBorrowed')}
                          >
                            Borrowed (PHP){sortIcon('totalBorrowed')}
                          </th>
                          <th
                            className="text-end cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('totalPaid')}
                          >
                            Paid (PHP){sortIcon('totalPaid')}
                          </th>
                          <th
                            className="text-end cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('outstandingBalance')}
                          >
                            Outstanding (PHP){sortIcon('outstandingBalance')}
                          </th>
                          <th
                            className="text-end cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('activeLoans')}
                          >
                            Active{sortIcon('activeLoans')}
                          </th>
                          <th
                            className="text-end cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('completedLoans')}
                          >
                            Completed{sortIcon('completedLoans')}
                          </th>
                          <th
                            className="text-end cursor-pointer user-select-none"
                            onClick={() => handleBorrowerSort('defaultedLoans')}
                          >
                            Defaulted{sortIcon('defaultedLoans')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {borrowerPaged.map((b, i) => (
                          <tr key={b.clientId}>
                            <td>{(borrowerPage - 1) * BORROWER_PER_PAGE + i + 1}</td>
                            <td>
                              <Link to={`/clients/${b.clientId}`}>{b.clientName}</Link>
                            </td>
                            <td className="text-end">{b.totalLoans}</td>
                            <td className="text-end">{formatCurrency(b.totalBorrowed)}</td>
                            <td className="text-end">{formatCurrency(b.totalPaid)}</td>
                            <td className="text-end">{formatCurrency(b.outstandingBalance)}</td>
                            <td className="text-end">{b.activeLoans}</td>
                            <td className="text-end">{b.completedLoans}</td>
                            <td className="text-end">{b.defaultedLoans}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={borrowerPage}
                    lastPage={Math.max(1, borrowerTotalPages)}
                    onPageChange={setBorrowerPage}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Outstanding Loans */}
      {activeTab === 'outstanding' && (
        <>
          {outstandingLoading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          {outstandingError && (
            <div className="alert alert-danger" role="alert">
              {outstandingError}
            </div>
          )}
          {!outstandingLoading && !outstandingError && (
            <>
              <div className="row mb-3">
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Active Loans</div>
                      <div className="fs-5 fw-bold">{outstandingActive}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Past Due</div>
                      <div className="fs-5 fw-bold">{outstandingPastDue}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Total Outstanding</div>
                      <div className="fs-5 fw-bold">{formatCurrency(outstandingTotalAmount)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ala-stat-card">
                    <div className="card-body py-2">
                      <div className="small text-muted">Avg Outstanding</div>
                      <div className="fs-5 fw-bold">{formatCurrency(outstandingAvgAmount)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {outstandingData.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No outstanding loans available.
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Loan #</th>
                          <th>Borrower</th>
                          <th className="text-end">Amount (PHP)</th>
                          <th className="text-end">Remaining (PHP)</th>
                          <th>Status</th>
                          <th>Released Date</th>
                          <th className="text-end">Days Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstandingData.map((l, i) => (
                            <tr key={l.id}>
                              <td>
                                {(outstandingPage - 1) * OUTSTANDING_PER_PAGE + i + 1}
                              </td>
                              <td>{l.loan_number ?? l.id}</td>
                              <td>
                                <Link to={`/clients/${l.client_id}`}>
                                  {l.client?.name ?? `Client #${l.client_id}`}
                                </Link>
                              </td>
                              <td className="text-end">{formatCurrency(l.amount)}</td>
                              <td className="text-end">{formatCurrency(l._remaining)}</td>
                              <td>
                                <StatusBadge status={l.loan_status ?? ''} />
                              </td>
                              <td>{formatDate(l.released_at ?? '')}</td>
                              <td className="text-end">{l._daysActive}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={outstandingPage}
                    lastPage={outstandingLastPage}
                    onPageChange={(p) => loadOutstanding(p)}
                  />
                </>
              )}
            </>
          )}
        </>
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
