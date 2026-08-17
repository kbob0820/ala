import { useEffect, useState } from 'react';
import type { PastDueLoan } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

interface ProcessPastDueModalProps {
  show: boolean;
  loan: PastDueLoan | null;
  defaultFee: number;
  loading: boolean;
  onConfirm: (installments: { id: number; late_fee: number }[]) => void;
  onCancel: () => void;
}

export function ProcessPastDueModal({
  show,
  loan,
  defaultFee,
  loading,
  onConfirm,
  onCancel,
}: ProcessPastDueModalProps) {
  const [fees, setFees] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!show || !loan) return;

    const next: Record<number, string> = {};
    for (const inst of loan.overdue_installments) {
      next[inst.id] = String(defaultFee);
    }
    setFees(next);
  }, [show, loan, defaultFee]);

  if (!show || !loan) return null;

  function setFee(id: number, value: string) {
    setFees((prev) => ({ ...prev, [id]: value }));
  }

  function removeFee(id: number) {
    setFees((prev) => ({ ...prev, [id]: '0' }));
  }

  function handleSubmit() {
    const installments = loan!.overdue_installments.map((inst) => ({
      id: inst.id,
      late_fee: Number(fees[inst.id] ?? String(defaultFee)),
    }));
    onConfirm(installments);
  }

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Process Past Due — {loan.client.name}</h5>
              <button type="button" className="btn-close" onClick={onCancel} />
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Set the late fee per overdue schedule. &quot;Remove&quot; sets the fee to
                0 (the schedule is still marked past-due).
              </p>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Due Date</th>
                      <th className="text-end">Past Due</th>
                      <th className="text-end">Current Fee</th>
                      <th style={{ width: 140 }}>Late Fee (PHP)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.overdue_installments.map((inst) => (
                      <tr key={inst.id}>
                        <td>{inst.installment_number}</td>
                        <td className="text-nowrap">{inst.due_date}</td>
                        <td className="text-end">{formatCurrency(inst.past_due_amount)}</td>
                        <td className="text-end text-danger">{formatCurrency(inst.late_fees)}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min={0}
                            step="0.01"
                            value={fees[inst.id] ?? String(defaultFee)}
                            onChange={(e) => setFee(inst.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeFee(inst.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
