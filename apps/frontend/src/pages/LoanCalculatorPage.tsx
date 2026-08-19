import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { LoanCalculation, InstallmentScheduleItem } from '@/types';
import { DEFAULT_INTEREST_RATE } from '@/types';
import { calculateLoan } from '@/services/loanService';
import { BorrowerLookup } from '@/components/BorrowerLookup';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

interface ReloanState {
  amount?: number;
  termMonths?: number;
  clientName?: string;
  remainingBalance?: number;
  parentLoanId?: number;
}

export default function LoanCalculatorPage() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const location = useLocation();
  const reloanState = (location.state as ReloanState) ?? {};

  const isReloan = !!reloanState.parentLoanId;

  const [mode, setMode] = useState<'new_loan' | 'reloan'>(isReloan ? 'reloan' : 'new_loan');
  const [calculationType, setCalculationType] = useState<'gross_amount' | 'monthly_installment' | 'net_proceeds'>('gross_amount');
  const [amount, setAmount] = useState('');
  const [termUnit, setTermUnit] = useState<'months' | 'installments'>('months');
  const [months, setMonths] = useState('2');
  const [termInstallments, setTermInstallments] = useState('4');
  const [interestRate, setInterestRate] = useState(DEFAULT_INTEREST_RATE);
  const [firstPaymentDueDate, setFirstPaymentDueDate] = useState('');
  const [charges, setCharges] = useState('0');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    clientId ? parseInt(clientId, 10) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LoanCalculation | null>(null);

  useEffect(() => {
    if (isReloan && reloanState.amount) {
      setAmount(reloanState.amount.toString());
    }
    if (isReloan && reloanState.termMonths) {
      const tm = reloanState.termMonths;
      setTermInstallments((tm * 2).toString());
      if (Number.isInteger(tm)) {
        setTermUnit('months');
        setMonths(tm.toString());
      } else {
        setTermUnit('installments');
      }
    }
  }, [isReloan, reloanState.amount, reloanState.termMonths]);

  const handleModeChange = (newMode: 'new_loan' | 'reloan') => {
    setMode(newMode);
    setResult(null);
    setError('');
    if (newMode === 'new_loan') {
      setAmount('');
      setTermUnit('installments');
      setMonths('2');
      setTermInstallments('4');
      setSelectedClientId(null);
    } else if (isReloan) {
      if (reloanState.amount) setAmount(reloanState.amount.toString());
      if (reloanState.termMonths) {
        const tm = reloanState.termMonths;
        setTermInstallments((tm * 2).toString());
        if (Number.isInteger(tm)) {
          setTermUnit('months');
          setMonths(tm.toString());
        } else {
          setTermUnit('installments');
        }
      }
      setSelectedClientId(clientId ? parseInt(clientId, 10) : null);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const selectedMonths = parseInt(months || '0', 10);
    const selectedInstallments = parseInt(termInstallments || '0', 10);

    if (!amount || (termUnit === 'months' ? !months : !termInstallments)) {
      setError('Amount and Term are required.');
      return;
    }

    let installmentCount: number;
    if (termUnit === 'months') {
      if (selectedMonths < 1 || selectedMonths > 5) {
        setError('Term must be between 1 and 5 months.');
        return;
      }
      installmentCount = selectedMonths * 2;
    } else {
      if (selectedInstallments < 1 || selectedInstallments > 10) {
        setError('Term must be between 1 and 10 installments.');
        return;
      }
      installmentCount = selectedInstallments;
    }

    const termMonths = installmentCount / 2;

    setLoading(true);
    try {
      const data = await calculateLoan({
        amount: parseFloat(amount),
        term_months: termMonths,
        interest_rate_per_month: parseFloat(interestRate),
        client_id: selectedClientId ?? undefined,
        parent_loan_id: mode === 'reloan' && reloanState.parentLoanId ? reloanState.parentLoanId : undefined,
        first_payment_due_date: firstPaymentDueDate || undefined,
        calculation_type: calculationType,
      });
      setResult(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Calculation failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!selectedClientId || !result) return;
    navigate(`/loans/new/${selectedClientId}`, {
      state: {
        amount: result.amount,
        term_months: result.term_months,
        interest_rate_per_month: result.interest_rate_per_month,
        first_payment_due_date: firstPaymentDueDate || undefined,
        calculation: result,
        oldBalance: mode === 'reloan' ? reloanState.remainingBalance : undefined,
        parentLoanId: mode === 'reloan' ? reloanState.parentLoanId : undefined,
      },
    });
  };

  return (
    <div>
      <h2 className="mb-1">Loan Calculator</h2>
      <p className="text-muted mb-4">
        Calculate gross loan, net proceeds, and amortization schedule
      </p>

      <div className="mb-4">
        <div className="btn-group w-100" role="group">
          <input
            type="radio"
            className="btn-check"
            name="calcMode"
            id="modeNewLoan"
            autoComplete="off"
            checked={mode === 'new_loan'}
            onChange={() => handleModeChange('new_loan')}
          />
          <label className="btn btn-outline-primary" htmlFor="modeNewLoan">
            <i className="fa-solid fa-plus me-1" />
            New Loan
          </label>
          <input
            type="radio"
            className="btn-check"
            name="calcMode"
            id="modeReloan"
            autoComplete="off"
            checked={mode === 'reloan'}
            onChange={() => handleModeChange('reloan')}
            disabled={!isReloan}
          />
          <label className="btn btn-outline-primary" htmlFor="modeReloan">
            <i className="fa-solid fa-rotate me-1" />
            Reloan
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {mode === 'reloan' && reloanState.remainingBalance !== undefined && (
            <div className="alert alert-warning mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <i className="fa-solid fa-triangle-exclamation me-2" />
                  <strong>Existing Loan Balance</strong>
                </div>
                <span className="fw-bold fs-5">{formatCurrency(reloanState.remainingBalance)}</span>
              </div>
              <div className="mt-1 small">
                This balance from Loan #{reloanState.parentLoanId} will be deducted from the new net proceeds.
              </div>
            </div>
          )}

          <div className="row">
            <div className="col-md-5">
              <form onSubmit={handleCalculate}>
                <div className="mb-3">
                  <label className="form-label">
                    Amount Type
                  </label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      name="calculationType"
                      id="calcGross"
                      autoComplete="off"
                      checked={calculationType === 'gross_amount'}
                      onChange={() => setCalculationType('gross_amount')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="calcGross">
                      Gross Amount
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name="calculationType"
                      id="calcMonthly"
                      autoComplete="off"
                      checked={calculationType === 'monthly_installment'}
                      onChange={() => setCalculationType('monthly_installment')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="calcMonthly">
                      Monthly Installment
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name="calculationType"
                      id="calcNet"
                      autoComplete="off"
                      checked={calculationType === 'net_proceeds'}
                      onChange={() => setCalculationType('net_proceeds')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="calcNet">
                      Net Proceeds
                    </label>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="amount" className="form-label">
                    {calculationType === 'gross_amount' ? 'Gross Amount' : calculationType === 'monthly_installment' ? 'Monthly Installment' : 'Net Proceeds'} <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="form-control"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Term <span className="text-danger">*</span>
                  </label>
                  <div className="btn-group w-100" role="group" aria-label="Term unit">
                    <input
                      type="radio"
                      className="btn-check"
                      name="calcTermUnit"
                      id="calcTermMonths"
                      autoComplete="off"
                      checked={termUnit === 'months'}
                      onChange={() => setTermUnit('months')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="calcTermMonths">
                      Months
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name="calcTermUnit"
                      id="calcTermInstallments"
                      autoComplete="off"
                      checked={termUnit === 'installments'}
                      onChange={() => setTermUnit('installments')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="calcTermInstallments">
                      Installments
                    </label>
                  </div>
                  {termUnit === 'months' ? (
                    <select
                      id="termMonths"
                      className="form-select mt-2"
                      aria-label="Number of months"
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                    >
                      <option value="1">1 month</option>
                      <option value="2">2 months</option>
                      <option value="3">3 months</option>
                      <option value="4">4 months</option>
                      <option value="5">5 months</option>
                    </select>
                  ) : (
                    <select
                      id="termMonths"
                      className="form-select mt-2"
                      aria-label="Number of installments"
                      value={termInstallments}
                      onChange={(e) => setTermInstallments(e.target.value)}
                    >
                      <option value="1">1 installment</option>
                      <option value="2">2 installments</option>
                      <option value="3">3 installments</option>
                      <option value="4">4 installments</option>
                      <option value="5">5 installments</option>
                      <option value="6">6 installments</option>
                      <option value="7">7 installments</option>
                      <option value="8">8 installments</option>
                      <option value="9">9 installments</option>
                      <option value="10">10 installments</option>
                    </select>
                  )}
                  <div className="form-text">Select months or number of installments (2 per month).</div>
                </div>

                <div className="mb-3">
                  <label htmlFor="interestRate" className="form-label">
                    Interest Rate %
                  </label>
                  <input
                    id="interestRate"
                    type="number"
                    className="form-control"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="firstPaymentDueDate" className="form-label">
                    First Payment Due Date
                  </label>
                  <input
                    id="firstPaymentDueDate"
                    type="date"
                    className="form-control"
                    value={firstPaymentDueDate}
                    onChange={(e) => setFirstPaymentDueDate(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="calcCharges" className="form-label">
                    Charges
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input
                      id="calcCharges"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="form-control"
                      value={charges}
                      onChange={(e) => setCharges(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-text">Deducted from Net Proceeds at release</div>
                </div>

                <BorrowerLookup
                  preselectedClient={
                    mode === 'reloan' && reloanState.clientName
                      ? { id: parseInt(clientId || '0', 10), name: reloanState.clientName }
                      : undefined
                  }
                  onChange={(id: number | null) => {
                    setSelectedClientId(id);
                  }}
                />

                {error && <div className="alert alert-danger">{error}</div>}

                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Calculating...
                    </>
                  ) : (
                    'Calculate'
                  )}
                </button>
              </form>
            </div>

            <div className="col-md-7">
              {loading && (
                <div className="d-flex flex-column align-items-center justify-content-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status" />
                  <span className="text-muted">Calculating...</span>
                </div>
              )}

              {!result && !loading && !error && (
                <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                  <i className="fa-solid fa-calculator fs-1 mb-2" />
                  <p className="mb-0">Enter loan details and click Calculate to see results.</p>
                </div>
              )}

              {result && (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="card bg-primary text-white h-100">
                        <div className="card-body text-center p-3">
                          <div className="small text-white-50">Gross Loan Amount</div>
                          <div className="fw-bold fs-5">{formatCurrency(result.amount)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card bg-success text-white h-100">
                        <div className="card-body text-center p-3">
                          <div className="small text-white-50">Net Proceeds</div>
                          <div className="fw-bold fs-5">{formatCurrency(result.net_proceeds)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card bg-warning text-white h-100">
                        <div className="card-body text-center p-3">
                          <div className="small text-white-50">Total Interest</div>
                          <div className="fw-bold fs-5">
                            {formatCurrency(result.total_interest)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card bg-info text-white h-100">
                        <div className="card-body text-center p-3">
                          <div className="small text-white-50">Installment Amount</div>
                          <div className="fw-bold fs-5">
                            {formatCurrency(result.installment_amount)}
                          </div>
                          <div className="small text-white-50">/ installment</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card mb-3">
                    <div className="card-header">
                      <strong>Loan Details</strong>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr>
                            <td className="text-muted ps-3">Interest Rate</td>
                            <td className="text-end pe-3 fw-bold">{result.interest_rate_per_month}% / month</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-3">Term</td>
                            <td className="text-end pe-3 fw-bold">{result.total_installments} installments ({result.term_months} month{result.term_months !== 1 ? 's' : ''})</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-3">Total Installments</td>
                            <td className="text-end pe-3 fw-bold">{result.total_installments} installments</td>
                          </tr>
                          {result.total_existing_balance !== undefined && result.total_existing_balance > 0 && (
                            <>
                              <tr className="border-top">
                                <td className="text-muted ps-3">Existing Loan Balance</td>
                                <td className="text-end pe-3 fw-bold text-warning">-{formatCurrency(result.total_existing_balance)}</td>
                              </tr>
                              <tr>
                                <td className="text-muted ps-3">Net After Existing Loans</td>
                                <td className="text-end pe-3 fw-bold">
                                  {formatCurrency(result.net_proceeds_after_deduction ?? Math.max(0, result.net_proceeds - result.total_existing_balance))}
                                </td>
                              </tr>
                              {result.total_exposure !== undefined && (
                                <tr>
                                  <td className="text-muted ps-3">Total Exposure</td>
                                  <td className="text-end pe-3">{formatCurrency(result.total_exposure)}</td>
                                </tr>
                              )}
                            </>
                          )}
                          {mode === 'reloan' && reloanState.remainingBalance !== undefined && result.total_existing_balance === undefined && (
                            <>
                              <tr className="border-top">
                                <td className="text-muted ps-3">Old Balance</td>
                                <td className="text-end pe-3 fw-bold text-warning">-{formatCurrency(reloanState.remainingBalance)}</td>
                              </tr>
                              <tr>
                                <td className="text-muted ps-3">Net After Existing Loans</td>
                                <td className="text-end pe-3 fw-bold">
                                  {formatCurrency(Math.max(0, result.net_proceeds - reloanState.remainingBalance))}
                                </td>
                              </tr>
                            </>
                          )}
                          {parseFloat(charges) > 0 && (
                            <>
                              <tr className="border-top">
                                <td className="text-muted ps-3">Charges</td>
                                <td className="text-end pe-3 fw-bold text-warning">-{formatCurrency(parseFloat(charges))}</td>
                              </tr>
                              <tr>
                                <td className="text-muted ps-3">Estimated Actual Release</td>
                                <td className="text-end pe-3 fw-bold text-success">
                                  {formatCurrency(Math.max(0, (result.net_proceeds_after_deduction ?? result.net_proceeds) - parseFloat(charges)))}
                                </td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {result.schedule && result.schedule.length > 0 && (
                    <div className="card mb-3">
                      <div className="card-header">
                        <strong>Amortization Schedule</strong>
                      </div>
                      <div className="card-body p-0">
                        <div className="table-responsive" style={{ maxHeight: 350 }}>
                          <table className="table table-sm table-bordered mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>#</th>
                                <th>Due Date</th>
                                <th>Amount (PHP)</th>
                                <th>Cumulative</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.schedule.map((item: InstallmentScheduleItem) => {
                                const cumulative = result.schedule
                                  .filter((s) => s.installment_number <= item.installment_number)
                                  .reduce((sum, s) => sum + s.amount, 0);
                                return (
                                  <tr key={item.installment_number}>
                                    <td>{item.installment_number}</td>
                                    <td>{formatDate(item.due_date)}</td>
                                    <td>{formatCurrency(item.amount)}</td>
                                    <td>{formatCurrency(cumulative)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedClientId && (
                    <button className="btn btn-success w-100" onClick={handleApply}>
                      Apply for Loan
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
