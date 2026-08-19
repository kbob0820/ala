import { useState, useEffect } from 'react';
import { GuarantorLookup } from '@/components/GuarantorLookup';
import { DEFAULT_INTEREST_RATE } from '@/types';

export interface LoanFormFields {
  amount: string;
  term_months: string;
  interest_rate_per_month: string;
  charges: string;
  charges_description: string;
  old_balance_settlement: string;
  guarantor: string;
  first_payment_due_date: string;
  calculation_type?: 'gross_amount' | 'monthly_installment' | 'net_proceeds';
}

interface LoanFormProps {
  initialData?: Partial<LoanFormFields>;
  clientId: number;
  borrowerName?: string;
  onSubmit: (fields: LoanFormFields) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  loading: boolean;
  secondaryLoading?: boolean;
  error: string | null;
  mode: 'create' | 'edit';
  showReloanFields?: boolean;
  onFieldsChange?: (fields: LoanFormFields) => void;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
}

export function LoanForm({
  initialData,
  clientId,
  borrowerName,
  onSubmit,
  onCancel,
  submitLabel,
  secondaryLabel,
  onSecondaryAction,
  loading,
  secondaryLoading,
  error,
  showReloanFields,
  onFieldsChange,
}: LoanFormProps) {
  const [calculationType, setCalculationType] = useState<'gross_amount' | 'monthly_installment' | 'net_proceeds'>(initialData?.calculation_type ?? 'gross_amount');
  const [amount, setAmount] = useState(initialData?.amount ?? '');

  const initialTermMonths = parseFloat(initialData?.term_months ?? '2') || 2;
  const initialInstallments = (initialTermMonths * 2).toString();
  const initialMonths = Number.isInteger(initialTermMonths) && initialTermMonths >= 1 && initialTermMonths <= 5
    ? initialTermMonths.toString()
    : '2';
  const [termUnit, setTermUnit] = useState<'months' | 'installments'>('installments');
  const [months, setMonths] = useState(initialMonths);
  const [installments, setInstallments] = useState(initialInstallments || '4');

  const [interestRate, setInterestRate] = useState(initialData?.interest_rate_per_month ?? DEFAULT_INTEREST_RATE);
  const [charges, setCharges] = useState(initialData?.charges ?? '0');
  const [chargesDescription, setChargesDescription] = useState(initialData?.charges_description ?? '');
  const [oldBalanceSettlement, setOldBalanceSettlement] = useState(initialData?.old_balance_settlement ?? '0');
  const [guarantor, setGuarantor] = useState(initialData?.guarantor ?? '');
  const [firstPaymentDueDate, setFirstPaymentDueDate] = useState(initialData?.first_payment_due_date ?? '');

  const installmentCount = termUnit === 'months'
    ? parseInt(months || '0', 10) * 2
    : parseInt(installments || '0', 10);
  const term = installmentCount / 2;
  const rate = parseFloat(interestRate) || 0;
  const chg = parseFloat(charges) || 0;
  const oldBal = parseFloat(oldBalanceSettlement) || 0;

  const totalInstallments = installmentCount;
  const rawInput = parseFloat(amount) || 0;
  const netFactor = 1 - (rate / 100) * term;
  const grossAmount = calculationType === 'monthly_installment'
    ? Math.round(rawInput * totalInstallments * 100) / 100
    : calculationType === 'net_proceeds'
      ? (netFactor > 0 ? Math.round((rawInput / netFactor) * 100) / 100 : 0)
      : rawInput;

  useEffect(() => {
    onFieldsChange?.({
      amount,
      term_months: installmentCount > 0 ? term.toString() : '',
      interest_rate_per_month: interestRate,
      charges,
      charges_description: chargesDescription,
      old_balance_settlement: oldBalanceSettlement,
      guarantor,
      first_payment_due_date: firstPaymentDueDate,
      calculation_type: calculationType,
    });
  }, [amount, installmentCount, term, interestRate, charges, chargesDescription, oldBalanceSettlement, guarantor, firstPaymentDueDate, calculationType, onFieldsChange]);

  const totalInterest = Math.round(grossAmount * (rate / 100) * term * 100) / 100;
  const netProceeds = Math.round((grossAmount - totalInterest) * 100) / 100;
  const installmentAmount = totalInstallments > 0 ? Math.round((grossAmount / totalInstallments) * 100) / 100 : 0;
  const actualRelease = Math.round((netProceeds - chg - oldBal) * 100) / 100;

  const amountLabel = calculationType === 'gross_amount'
    ? 'Gross Loan Amount'
    : calculationType === 'monthly_installment'
      ? 'Monthly Installment'
      : 'Net Proceeds';
  const amountPlaceholder = calculationType === 'gross_amount'
    ? 'e.g. 10000'
    : calculationType === 'monthly_installment'
      ? 'e.g. 2500'
      : 'e.g. 7000';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawInput = parseFloat(amount) || 0;
    const totalInst = installmentCount;
    const finalAmount = calculationType === 'monthly_installment'
      ? (rawInput * totalInst).toFixed(2)
      : calculationType === 'net_proceeds'
        ? (netFactor > 0 ? (rawInput / netFactor).toFixed(2) : '0')
        : amount.trim();
    await onSubmit({
      amount: finalAmount,
      term_months: installmentCount > 0 ? term.toString() : '',
      interest_rate_per_month: interestRate.trim(),
      charges: charges.trim(),
      charges_description: chargesDescription.trim(),
      old_balance_settlement: oldBalanceSettlement.trim(),
      guarantor: guarantor.trim(),
      first_payment_due_date: firstPaymentDueDate,
      calculation_type: calculationType,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <i className="fa-solid fa-file-invoice me-2" />
              Loan Details
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Borrower</label>
                <input
                  type="text"
                  className="form-control bg-light"
                  value={borrowerName ? `${borrowerName} (#${clientId})` : `Client #${clientId}`}
                  disabled
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Amount Type</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="loanCalcType"
                    id="loanCalcGross"
                    autoComplete="off"
                    checked={calculationType === 'gross_amount'}
                    onChange={() => setCalculationType('gross_amount')}
                  />
                  <label className="btn btn-outline-primary" htmlFor="loanCalcGross">
                    Gross Amount
                  </label>
                  <input
                    type="radio"
                    className="btn-check"
                    name="loanCalcType"
                    id="loanCalcMonthly"
                    autoComplete="off"
                    checked={calculationType === 'monthly_installment'}
                    onChange={() => setCalculationType('monthly_installment')}
                  />
                  <label className="btn btn-outline-primary" htmlFor="loanCalcMonthly">
                    Monthly Installment
                  </label>
                  <input
                    type="radio"
                    className="btn-check"
                    name="loanCalcType"
                    id="loanCalcNet"
                    autoComplete="off"
                    checked={calculationType === 'net_proceeds'}
                    onChange={() => setCalculationType('net_proceeds')}
                  />
                  <label className="btn btn-outline-primary" htmlFor="loanCalcNet">
                    Net Proceeds
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="loan-amount" className="form-label">
                  {amountLabel} <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">{'\u20B1'}</span>
                  <input
                    id="loan-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="form-control"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder={amountPlaceholder}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Term <span className="text-danger">*</span>
                  </label>
                  <div className="btn-group w-100" role="group" aria-label="Term unit">
                    <input
                      type="radio"
                      className="btn-check"
                      name="loanTermUnit"
                      id="loanTermMonths"
                      autoComplete="off"
                      checked={termUnit === 'months'}
                      onChange={() => setTermUnit('months')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="loanTermMonths">
                      Months
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name="loanTermUnit"
                      id="loanTermInstallments"
                      autoComplete="off"
                      checked={termUnit === 'installments'}
                      onChange={() => setTermUnit('installments')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="loanTermInstallments">
                      Installments
                    </label>
                  </div>
                  {termUnit === 'months' ? (
                    <select
                      id="loan-term"
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
                      id="loan-term"
                      className="form-select mt-2"
                      aria-label="Number of installments"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
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
                <div className="col-md-6 mb-3">
                  <label htmlFor="loan-rate" className="form-label">
                    Interest Rate / mo
                  </label>
                  <div className="input-group">
                    <input
                      id="loan-rate"
                      type="number"
                      className="form-control"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="loan-due-date" className="form-label">
                  First Payment Due Date
                </label>
                <input
                  id="loan-due-date"
                  type="date"
                  className="form-control"
                  value={firstPaymentDueDate}
                  onChange={(e) => setFirstPaymentDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <i className="fa-solid fa-calculator me-2" />
              Loan Breakdown
            </div>
            <div className="card-body">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td>Gross Loan Amount</td>
                    <td className="text-end fw-medium">{formatCurrency(grossAmount)}</td>
                  </tr>
                  <tr>
                    <td>
                      Total Interest ({rate}% × {term} mo)
                    </td>
                    <td className="text-end text-danger">-{formatCurrency(totalInterest)}</td>
                  </tr>
                  {oldBal > 0 && (
                    <tr>
                      <td>Old Balance</td>
                      <td className="text-end text-warning fw-medium">-{formatCurrency(oldBal)}</td>
                    </tr>
                  )}
                  {chg > 0 && (
                    <tr>
                      <td>Charges</td>
                      <td className="text-end">-{formatCurrency(chg)}</td>
                    </tr>
                  )}
                  {oldBal > 0 && (
                    <tr>
                      <td>
                        Total Deductions (interest + charges)
                      </td>
                      <td className="text-end text-danger">-{formatCurrency(totalInterest + chg)}</td>
                    </tr>
                  )}
                  <tr className="border-top">
                    <td className="fw-medium">Net Proceeds</td>
                    <td className="text-end fw-bold">{formatCurrency(netProceeds)}</td>
                  </tr>
                  <tr className="border-top">
                    <td>Installments</td>
                    <td className="text-end">
                      {totalInstallments > 0
                        ? `${totalInstallments} × ${formatCurrency(installmentAmount)}`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2">
                <small className="text-muted">
                  Net Proceeds = Gross Amount &minus; Total Interest
                </small>
              </div>
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-body">
              <div className="mb-3">
                <GuarantorLookup
                  onChange={setGuarantor}
                  excludeClientId={clientId}
                  preselectedName={initialData?.guarantor || undefined}
                />
              </div>

              <div className="border-top pt-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-medium">Actual Release</div>
                  <small className="text-muted">
                    {oldBal > 0
                      ? 'Net Proceeds − Charges − Old Balance'
                      : chg > 0
                        ? 'Net Proceeds − Charges'
                        : 'Net Proceeds (no deductions)'}
                  </small>
                </div>
                <span className="fw-bold text-nowrap">{formatCurrency(actualRelease)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
        {secondaryLabel && onSecondaryAction && (
          <button
            type="button"
            className="btn btn-success"
            onClick={onSecondaryAction}
            disabled={secondaryLoading}
          >
            {secondaryLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" />
                Submitting...
              </>
            ) : (
              secondaryLabel
            )}
          </button>
        )}
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
