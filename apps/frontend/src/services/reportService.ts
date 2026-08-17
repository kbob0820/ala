import { getLoans } from './loanService';
import { getLoanPayments } from './paymentService';
import type { Loan, Payment } from '@/types';

export interface DailyCollection {
  date: string;
  count: number;
  total: number;
  cash: number;
  gcash: number;
  bpi: number;
  bdo: number;
  other: number;
}

export interface MonthlyCollection {
  month: string;
  count: number;
  total: number;
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  amount: number;
}

export interface LoanLedgerEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface BorrowerSummary {
  clientId: number;
  clientName: string;
  totalLoans: number;
  totalBorrowed: number;
  totalPaid: number;
  outstandingBalance: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
}

export async function generateDailyCollections(dateFrom?: string, dateTo?: string): Promise<DailyCollection[]> {
  const result = await getLoans({
    loan_status: 'active,past_due,delinquent,fully_paid,closed,defaulted,settled_by_reloan',
    per_page: 200,
  });

  const allPayments: Payment[] = [];
  for (const loan of result.data) {
    try {
      const payments = await getLoanPayments(loan.id);
      allPayments.push(...payments);
    } catch {
      // skip loans that fail
    }
  }

  const from = dateFrom ? new Date(dateFrom) : new Date(0);
  const to = dateTo ? new Date(dateTo) : new Date();
  to.setHours(23, 59, 59, 999);

  const filtered = allPayments.filter((p) => {
    const d = new Date(p.payment_date);
    return d >= from && d <= to;
  });

  const grouped = new Map<string, Payment[]>();
  for (const p of filtered) {
    const key = p.payment_date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  const collections: DailyCollection[] = [];
  for (const [date, payments] of grouped) {
    const m = (method: string) =>
      payments.filter((p) => p.payment_method.toLowerCase() === method).reduce((s, p) => s + p.amount, 0);

    collections.push({
      date,
      count: payments.length,
      total: payments.reduce((s, p) => s + p.amount, 0),
      cash: m('cash'),
      gcash: m('gcash'),
      bpi: m('bpi'),
      bdo: m('bdo'),
      other: payments.filter((p) => !['cash', 'gcash', 'bpi', 'bdo'].includes(p.payment_method.toLowerCase())).reduce((s, p) => s + p.amount, 0),
    });
  }

  return collections.sort((a, b) => b.date.localeCompare(a.date));
}

export async function generateMonthlyCollections(months = 12): Promise<MonthlyCollection[]> {
  const collections = await generateDailyCollections();

  const grouped = new Map<string, { count: number; total: number }>();
  for (const c of collections) {
    const key = c.date.substring(0, 7);
    if (!grouped.has(key)) grouped.set(key, { count: 0, total: 0 });
    const entry = grouped.get(key)!;
    entry.count += c.count;
    entry.total += c.total;
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, months)
    .map(([month, data]) => ({ month, ...data }));
}

export async function generateAgingReport(): Promise<AgingBucket[]> {
  const result = await getLoans({
    loan_status: 'active,past_due,delinquent',
    per_page: 200,
  });

  const loanPayments = new Map<number, number>();
  for (const loan of result.data) {
    try {
      const payments = await getLoanPayments(loan.id);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      loanPayments.set(loan.id, totalPaid);
    } catch {
      loanPayments.set(loan.id, 0);
    }
  }

  const now = new Date();
  const buckets: AgingBucket[] = [
    { label: 'Current (0-30 days)', minDays: 0, maxDays: 30, count: 0, amount: 0 },
    { label: '31-60 days', minDays: 31, maxDays: 60, count: 0, amount: 0 },
    { label: '61-90 days', minDays: 61, maxDays: 90, count: 0, amount: 0 },
    { label: '91-180 days', minDays: 91, maxDays: 180, count: 0, amount: 0 },
    { label: '181+ days', minDays: 181, maxDays: null, count: 0, amount: 0 },
  ];

  for (const loan of result.data) {
    if (!loan.released_at) continue;
    const releasedDate = new Date(loan.released_at);
    const daysSince = Math.floor((now.getTime() - releasedDate.getTime()) / (1000 * 60 * 60 * 24));
    const paid = loanPayments.get(loan.id) ?? 0;
    const balance = Math.max(0, loan.amount - paid);

    const bucket = buckets.find(
      (b) => daysSince >= b.minDays && (b.maxDays === null || daysSince <= b.maxDays),
    );
    if (bucket && balance > 0) {
      bucket.count++;
      bucket.amount += balance;
    }
  }

  return buckets;
}

export async function generateLoanLedger(loanId: number): Promise<LoanLedgerEntry[] | null> {
  try {
    const payments = await getLoanPayments(loanId);
    const result = await getLoans({ client_id: undefined, per_page: 200 });
    const loan = result.data.find((l) => l.id === loanId);
    if (!loan) return null;

    const entries: LoanLedgerEntry[] = [];
    let balance = 0;

    entries.push({
      date: loan.released_at ?? loan.created_at,
      description: loan.released_at ? 'Loan Released' : 'Loan Created',
      debit: loan.amount,
      credit: 0,
      balance: loan.amount,
    });
    balance = loan.amount;

    const sorted = [...payments].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime(),
    );

    for (const p of sorted) {
      balance -= p.amount;
      entries.push({
        date: p.payment_date,
        description: `Payment — ${p.payment_method}${p.notes ? ` (${p.notes})` : ''}`,
        debit: 0,
        credit: p.amount,
        balance: Math.max(0, balance),
      });
    }

    return entries;
  } catch {
    return null;
  }
}

export async function generateBorrowerSummary(): Promise<BorrowerSummary[]> {
  const result = await getLoans({
    per_page: 500,
  });

  const grouped = new Map<number, Loan[]>();
  for (const loan of result.data) {
    if (!grouped.has(loan.client_id)) grouped.set(loan.client_id, []);
    grouped.get(loan.client_id)!.push(loan);
  }

  const summaries: BorrowerSummary[] = [];
  for (const [clientId, loans] of grouped) {
    const first = loans[0];
    const totalBorrowed = loans.filter((l) => l.loan_status && l.loan_status !== 'waiting_for_release').reduce((s, l) => s + l.amount, 0);

    let totalPaid = 0;
    for (const loan of loans) {
      try {
        const payments = await getLoanPayments(loan.id);
        totalPaid += payments.reduce((s, p) => s + p.amount, 0);
      } catch {
        // skip
      }
    }

    const outstandingBalance = loans
      .filter((l) => l.loan_status && ['active', 'past_due', 'delinquent'].includes(l.loan_status))
      .reduce((s, l) => s + l.amount, 0) - totalPaid;

    summaries.push({
      clientId,
      clientName: first?.client?.name ?? `Client #${clientId}`,
      totalLoans: loans.length,
      totalBorrowed,
      totalPaid,
      outstandingBalance: Math.max(0, outstandingBalance),
      activeLoans: loans.filter((l) => l.loan_status === 'active').length,
      completedLoans: loans.filter((l) => l.loan_status === 'fully_paid' || l.loan_status === 'closed' || l.loan_status === 'settled_by_reloan').length,
      defaultedLoans: loans.filter((l) => l.loan_status === 'defaulted').length,
    });
  }

  return summaries.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
}
