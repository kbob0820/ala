import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLoan,
  submitLoan,
  approveLoan,
  rejectLoan,
  releaseLoan,
  cancelLoan,
  voidLoan,
  updateReleaseSource as updateReleaseSourceApi,
} from '@/services/loanService';
import { recordPayment, updatePayment, deletePayment } from '@/services/paymentService';
import { getPaymentTypes } from '@/services/paymentTypeService';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LoanTimeline } from '@/components/LoanTimeline';
import { useAuth } from '@/hooks/useAuth';
import type { Loan, PaymentType } from '@/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

interface ReleaseSource {
  release_method: string;
  amount: string;
  notes: string;
  release_date: string;
}

interface PaymentForm {
  amount: string;
  payment_method: string;
  payment_date: string;
  notes: string;
  proof_image: File | null;
}

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmVariant?: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseSources, setReleaseSources] = useState<ReleaseSource[]>([
    { release_method: '', amount: '', notes: '', release_date: new Date().toISOString().slice(0, 10) },
  ]);
  const [releaseFiles, setReleaseFiles] = useState<Map<number, File | null>>(new Map());
  const [releaseMethods, setReleaseMethods] = useState<PaymentType[]>([]);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [releaseCharges, setReleaseCharges] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveData, setApproveData] = useState({
    amount: '',
    interest_rate_per_month: '',
    term_months: '',
  });

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    payment_method: '',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
    proof_image: null,
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentType[]>([]);

  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editMethod, setEditMethod] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editProofFile, setEditProofFile] = useState<File | null>(null);
  const [editRemoveProof, setEditRemoveProof] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [editPaymentProofFile, setEditPaymentProofFile] = useState<File | null>(null);
  const [editPaymentRemoveProof, setEditPaymentRemoveProof] = useState(false);
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  const releaseTotalFees = useMemo(
    () =>
      releaseSources.reduce((sum, s) => {
        const method = releaseMethods.find((m) => m.name === s.release_method);
        return sum + (method?.fee ?? 0);
      }, 0),
    [releaseSources, releaseMethods],
  );

  const releaseNetPool = useMemo(
    () =>
      (loan?.net_proceeds ?? 0) -
      (parseFloat(releaseCharges) || 0) -
      (loan?.old_balance_settlement ?? 0) -
      releaseTotalFees,
    [loan?.net_proceeds, loan?.old_balance_settlement, releaseCharges, releaseTotalFees],
  );

  const releaseAllocated = useMemo(
    () =>
      releaseSources.reduce(
        (sum, s) => sum + (parseFloat(s.amount) || 0),
        0,
      ),
    [releaseSources],
  );

  const releaseRemaining = releaseNetPool - releaseAllocated;

  const fetchLoan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getLoan(Number(id));
      setLoan(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load loan';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchLoan();
    }
  }, [fetchLoan, id]);

  function clearMessages() {
    setActionError(null);
    setActionSuccess(null);
  }

  async function doSubmit() {
    setActionLoading(true);
    try {
      const updated = await submitLoan(Number(id));
      setLoan(updated);
      setActionSuccess('Loan submitted successfully');
      await fetchLoan();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to submit loan',
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleSubmit() {
    clearMessages();
    setConfirmAction({
      title: 'Submit Loan',
      message: 'Are you sure you want to submit this loan for review?',
      onConfirm: doSubmit,
    });
    setShowConfirmModal(true);
  }

  function openApproveModal() {
    clearMessages();
    setApproveData({
      amount: '',
      interest_rate_per_month: '',
      term_months: '',
    });
    setShowApproveModal(true);
  }

  async function doApprove() {
    setActionLoading(true);
    try {
      const payload: { amount?: number; interest_rate_per_month?: number; term_months?: number } = {};
      if (approveData.amount) payload.amount = parseFloat(approveData.amount);
      if (approveData.interest_rate_per_month) payload.interest_rate_per_month = parseFloat(approveData.interest_rate_per_month);
      if (approveData.term_months) payload.term_months = parseFloat(approveData.term_months);
      const updated = await approveLoan(Number(id), Object.keys(payload).length > 0 ? payload : undefined);
      setLoan(updated);
      setActionSuccess('Loan approved successfully');
      setShowApproveModal(false);
      await fetchLoan();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to approve loan',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function doReject() {
    setActionLoading(true);
    try {
      const updated = await rejectLoan(Number(id));
      setLoan(updated);
      setActionSuccess('Loan rejected');
      await fetchLoan();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to reject loan',
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleReject() {
    clearMessages();
    setConfirmAction({
      title: 'Reject Loan',
      message: 'Are you sure you want to reject this loan?',
      confirmVariant: 'danger',
      confirmLabel: 'Reject',
      onConfirm: doReject,
    });
    setShowConfirmModal(true);
  }

  async function doCancel() {
    setActionLoading(true);
    try {
      const updated = await cancelLoan(Number(id));
      setLoan(updated);
      setActionSuccess('Loan cancelled');
      await fetchLoan();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to cancel loan',
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleCancel() {
    clearMessages();
    setConfirmAction({
      title: 'Cancel Loan',
      message: 'Are you sure you want to cancel this loan?',
      confirmVariant: 'warning',
      confirmLabel: 'Cancel Loan',
      onConfirm: doCancel,
    });
    setShowConfirmModal(true);
  }

  async function doVoid() {
    setActionLoading(true);
    try {
      const updated = await voidLoan(Number(id));
      setLoan(updated);
      setActionSuccess('Loan release voided');
      await fetchLoan();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to void loan release',
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleVoid() {
    clearMessages();
    setConfirmAction({
      title: 'Void Release',
      message: 'This will undo the loan release. All release source records will be deleted and installments reset to pending. This action cannot be undone.',
      confirmVariant: 'warning',
      confirmLabel: 'Void Release',
      onConfirm: doVoid,
    });
    setShowConfirmModal(true);
  }

  async function handleRelease() {
    clearMessages();
    setReleaseSources([{ release_method: '', amount: '', notes: '', release_date: new Date().toISOString().slice(0, 10) }]);
    setReleaseFiles(new Map());
    try {
      const result = await getPaymentTypes({ per_page: 100 });
      setReleaseMethods(result.data.filter((p) => p.category === 'release_method' && p.is_active));
    } catch {
      setReleaseMethods([]);
    }
    setReleaseDate(new Date().toISOString().slice(0, 10));
    setReleaseCharges(loan?.charges?.toString() ?? '');
    setShowReleaseModal(true);
  }

  function addReleaseSource() {
    setReleaseSources((prev) => [
      ...prev,
      { release_method: '', amount: '', notes: '', release_date: new Date().toISOString().slice(0, 10) },
    ]);
  }

  function removeReleaseSource(index: number) {
    setReleaseSources((prev) => prev.filter((_, i) => i !== index));
    setReleaseFiles((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  }

  function updateReleaseSource(
    index: number,
    field: keyof ReleaseSource,
    value: string,
  ) {
    setReleaseSources((prev) =>
      prev.map((src, i) => (i === index ? { ...src, [field]: value } : src)),
    );
  }

  async function submitRelease() {
    setActionLoading(true);
    setActionError(null);

    try {
      const formData = new FormData();
      formData.append('_method', 'PUT');
      releaseSources.forEach((s, index) => {
        formData.append(`sources[${index}][release_method]`, s.release_method);
        formData.append(`sources[${index}][amount]`, s.amount);
        formData.append(`sources[${index}][notes]`, s.notes || '');
        formData.append(`sources[${index}][release_date]`, s.release_date);
      });

      releaseFiles.forEach((file, index) => {
        if (file) {
          formData.append(`sources[${index}][proof_image]`, file);
        }
      });

      formData.append('released_at', releaseDate);
      formData.append('charges', releaseCharges || '0');

      const updated = await releaseLoan(Number(id), formData);
      setLoan(updated);
      setActionSuccess('Loan released successfully');
      setShowReleaseModal(false);
      await fetchLoan();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to release loan',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const formData = new FormData();
      formData.append('amount', paymentForm.amount);
      formData.append('payment_method', paymentForm.payment_method);
      formData.append('payment_date', paymentForm.payment_date);
      if (paymentForm.notes.trim()) {
        formData.append('notes', paymentForm.notes.trim());
      }
      if (paymentForm.proof_image) {
        formData.append('proof_image', paymentForm.proof_image);
      }

      const updated = await recordPayment(Number(id), formData);
      setLoan(updated);
      setShowPaymentForm(false);
      setPaymentForm({
        amount: '',
        payment_method: '',
        payment_date: new Date().toISOString().slice(0, 10),
        notes: '',
        proof_image: null,
      });
      await fetchLoan();
    } catch (err: unknown) {
      setPaymentError(
        err instanceof Error ? err.message : 'Failed to record payment',
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  async function togglePaymentForm() {
    if (!showPaymentForm) {
      try {
        const result = await getPaymentTypes({ per_page: 100 });
        setPaymentMethods(result.data.filter((p) => p.category === 'payment_method' && p.is_active));
      } catch {
        setPaymentMethods([]);
      }
    }
    setShowPaymentForm(!showPaymentForm);
  }

  function openEditSource(sourceId: number, method: string, amount: number, notes: string | null, releaseDate: string | null) {
    setEditError(null);
    setEditingSourceId(sourceId);
    setEditMethod(method);
    setEditAmount(amount.toString());
    setEditNotes(notes ?? '');
    setEditDate(releaseDate ?? '');
    setEditProofFile(null);
    setEditRemoveProof(false);
    getPaymentTypes({ per_page: 100 })
      .then((result) => setReleaseMethods(result.data.filter((p) => p.category === 'release_method' && p.is_active)))
      .catch(() => setReleaseMethods([]));
  }

  function cancelEdit() {
    setEditingSourceId(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!id || editingSourceId === null) return;

    if (editProofFile && !editProofFile.type.startsWith('image/')) {
      setEditError('The proof file must be an image (jpg, jpeg, png, gif, webp, bmp).');
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const formData = new FormData();
      formData.append('release_method', editMethod);
      formData.append('amount', editAmount);
      formData.append('notes', editNotes);
      if (editDate) {
        formData.append('release_date', editDate);
      }

      if (editProofFile) {
        formData.append('proof_image', editProofFile);
      }
      if (editRemoveProof) {
        formData.append('remove_proof', '1');
      }

      const updated = await updateReleaseSourceApi(Number(id), editingSourceId, formData);
      setLoan(updated);
      setEditingSourceId(null);
      await fetchLoan();
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : 'Failed to update release source',
      );
    } finally {
      setEditSaving(false);
    }
  }

  function openPaymentEdit(paymentId: number, notes: string | null) {
    setEditingPaymentId(paymentId);
    setEditPaymentNotes(notes ?? '');
    setEditPaymentProofFile(null);
    setEditPaymentRemoveProof(false);
    setEditPaymentError(null);
  }

  function cancelPaymentEdit() {
    setEditingPaymentId(null);
    setEditPaymentError(null);
  }

  async function savePaymentEdit() {
    if (!id || editingPaymentId === null) return;

    if (editPaymentProofFile && !editPaymentProofFile.type.startsWith('image/')) {
      setEditPaymentError('The proof file must be an image (jpg, jpeg, png, gif, webp, bmp).');
      return;
    }

    setEditPaymentSaving(true);
    setEditPaymentError(null);

    try {
      const formData = new FormData();
      formData.append('notes', editPaymentNotes);

      if (editPaymentProofFile) {
        formData.append('proof_image', editPaymentProofFile);
      }
      if (editPaymentRemoveProof) {
        formData.append('remove_proof', '1');
      }

      const updated = await updatePayment(Number(id), editingPaymentId, formData);
      setLoan(updated);
      setEditingPaymentId(null);
      await fetchLoan();
    } catch (err: unknown) {
      setEditPaymentError(
        err instanceof Error ? err.message : 'Failed to update payment',
      );
    } finally {
      setEditPaymentSaving(false);
    }
  }

  async function handleDeletePayment(paymentId: number) {
    setConfirmAction({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment? This will recalculate installment statuses.',
      confirmVariant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        if (!id) return;
        const updated = await deletePayment(Number(id), paymentId);
        setLoan(updated);
        await fetchLoan();
      },
    });
    setShowConfirmModal(true);
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!loan) {
    return <div className="alert alert-warning">Loan not found</div>;
  }

  const isSettledByReloan = loan.loan_status === 'settled_by_reloan';

  const canEditReleaseSources =
    (user?.role?.slug === 'administrator' || user?.role?.slug === 'approver') && !isSettledByReloan;

  const canEditPayments =
    (user?.role?.slug === 'administrator' || user?.role?.slug === 'approver') && !isSettledByReloan;

  const canRecordPayment =
    loan.application_status !== 'cancelled' &&
    loan.loan_status !== 'cancelled' &&
    loan.loan_status !== 'fully_paid' &&
    !isSettledByReloan;

  const canEdit = loan.loan_status === 'waiting_for_release';
  const hasReleaseSources =
    loan.release_sources && loan.release_sources.length > 0;

  const totalPaid =
    loan.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const remainingBalance =
    loan.remaining_balance !== undefined
      ? loan.remaining_balance
      : loan.amount - totalPaid;

  const originalNetProceeds = loan.amount - loan.total_interest;
  const isReleased = ['active', 'past_due', 'delinquent', 'released', 'fully_paid', 'settled_by_reloan'].includes(loan.loan_status ?? '');
  const isReloanWithSettlement = loan.loan_type === 'reloan' && (loan.old_balance_settlement ?? 0) > 0;
  const modifiedNetProceeds = Math.max(0, (loan.net_proceeds ?? 0) - (loan.old_balance_settlement ?? 0) - (loan.charges ?? 0));

  const showApprove =
    ['submitted', 'under_review', 'pending_documents'].includes(
      loan.application_status,
    );
  const showReject = showApprove;
  const showRelease = loan.loan_status === 'waiting_for_release';
  const showSubmit = loan.application_status === 'draft';
  const showCancel = ['draft', 'submitted', 'under_review'].includes(
    loan.application_status,
  ) || (loan.application_status === 'approved' && loan.loan_status === 'waiting_for_release');
  const showVoid = loan.loan_status === 'active' && (!loan.payments || loan.payments.length === 0);
  const showEdit = canEdit;
  const showActions =
    showEdit || showSubmit || showApprove || showReject || showRelease || showCancel || showVoid;

  const tabItems: string[] = ['timeline', 'details', 'installments'];
  if (loan.loan_status !== 'waiting_for_release' && loan.application_status !== 'under_review' && hasReleaseSources) {
    tabItems.push('payments');
  }
  if (hasReleaseSources) {
    tabItems.push('release');
  }

  const borrowerName = loan.client?.name;

  return (
    <div>
      <div className="ala-page-header">
        <div className="ala-page-header-left">
          <nav className="ala-breadcrumbs">
            <Link to="/loans" className="ala-breadcrumb-link">Loans</Link>
            <i className="fa-solid fa-chevron-right ala-breadcrumb-sep" />
            <span className="ala-breadcrumb-current">Loan #{loan.id}</span>
          </nav>
          <h1 className="ala-page-title" style={{ margin: 0, fontSize: 'var(--ala-text-4xl)', fontWeight: 700 }}>
            Loan #{loan.id}{' '}
            <StatusBadge status={loan.loan_status ?? loan.application_status} />
          </h1>
          {borrowerName && (
            <div style={{ marginTop: '0.375rem', fontSize: 'var(--ala-text-5xl)', fontWeight: 700, color: 'var(--ala-gray-900)' }}>
              <i className="fa-solid fa-user me-1" />
              <Link to={`/clients/${loan.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {borrowerName}
              </Link>
            </div>
          )}
        </div>
        {showActions && (
          <div className="ala-page-header-actions">
            {showEdit && (
              <Link to={`/loans/${loan.id}/edit`} className="btn btn-outline-secondary">
                Edit
              </Link>
            )}
            {showSubmit && (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={actionLoading}>
                Submit
              </button>
            )}
            {showApprove && (
              <button className="btn btn-primary" onClick={openApproveModal} disabled={actionLoading}>
                Approve
              </button>
            )}
            {showReject && (
              <button className="btn btn-outline-danger" onClick={handleReject} disabled={actionLoading}>
                Reject
              </button>
            )}
            {showRelease && (
              <button className="btn btn-primary" onClick={handleRelease} disabled={actionLoading}>
                Release
              </button>
            )}
            {showCancel && (
              <button className="btn btn-outline-danger" onClick={handleCancel} disabled={actionLoading}>
                Cancel
              </button>
            )}
            {showVoid && (
              <button className="btn btn-outline-warning" onClick={handleVoid} disabled={actionLoading}>
                Void Release
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="alert alert-danger alert-dismissible d-flex align-items-center">
          <i className="fa-solid fa-circle-exclamation me-2" />
          {actionError}
          <button type="button" className="btn-close ms-auto" onClick={() => setActionError(null)} />
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success alert-dismissible d-flex align-items-center">
          <i className="fa-solid fa-circle-check me-2" />
          {actionSuccess}
          <button type="button" className="btn-close ms-auto" onClick={() => setActionSuccess(null)} />
        </div>
      )}

      <div className="ala-loan-summary">
        <div className="ala-summary-item">
          <div className="ala-summary-label">Gross Amount</div>
          <div className="ala-summary-value">{formatCurrency(loan.amount)}</div>
        </div>
        <div className="ala-summary-item">
          <div className="ala-summary-label">Installment</div>
          <div className="ala-summary-value" style={{ color: 'var(--ala-blue-700)' }}>{formatCurrency(loan.installment_amount)}</div>
        </div>
        {isReleased ? (
          <>
            <div className="ala-summary-item">
              <div className="ala-summary-label">Net Proceeds</div>
              <div className="ala-summary-value" style={{ color: 'var(--ala-success-600)' }}>{formatCurrency(originalNetProceeds)}</div>
            </div>
            <div className="ala-summary-item">
              <div className="ala-summary-label">Net Released</div>
              <div className="ala-summary-value" style={{ color: 'var(--ala-blue-700)' }}>{formatCurrency(loan.net_proceeds)}</div>
            </div>
          </>
        ) : isReloanWithSettlement ? (
          <div className="ala-summary-item">
            <div className="ala-summary-label">Modified Net Proceeds</div>
            <div className="ala-summary-value" style={{ color: modifiedNetProceeds > 0 ? 'var(--ala-warning-600)' : 'var(--ala-danger-600)' }}>
              {formatCurrency(modifiedNetProceeds)}
            </div>
          </div>
        ) : (
          <div className="ala-summary-item">
            <div className="ala-summary-label">Net Proceeds</div>
            <div className="ala-summary-value" style={{ color: 'var(--ala-success-600)' }}>{formatCurrency(loan.net_proceeds)}</div>
          </div>
        )}
        <div className="ala-summary-item">
          <div className="ala-summary-label">Remaining</div>
          <div className="ala-summary-value" style={{ color: remainingBalance > 0 ? 'var(--ala-danger-600)' : 'var(--ala-gray-600)' }}>
            {formatCurrency(remainingBalance)}
          </div>
        </div>
      </div>

      <div className="ala-tabs">
        {tabItems.map((tab) => (
          <button
            key={tab}
            className={`ala-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'timeline' && (
        <div>
          <div className="ala-card" style={{ marginBottom: 'var(--ala-space-5)' }}>
            <div style={{ padding: 'var(--ala-space-5)' }}>
              <LoanTimeline loan={loan} />
            </div>
          </div>
          <div className="ala-card">
            <div style={{ padding: 'var(--ala-space-5)' }}>
              <h6 style={{ fontSize: 'var(--ala-text-base)', fontWeight: 600, marginBottom: 'var(--ala-space-4)' }}>Key Details</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Created By</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.created_by_user?.name ?? '—'}</div>
                </div>
                <div className="col-md-6">
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Approved By</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.approved_by_user?.name ?? '—'}</div>
                </div>
                <div className="col-md-6">
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Created</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.created_at)}</div>
                </div>
                {loan.approved_at && (
                  <div className="col-md-6">
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Approved</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.approved_at)}</div>
                  </div>
                )}
                {loan.released_at && (
                  <div className="col-md-6">
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Released</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.released_at)}</div>
                  </div>
                )}
                {loan.closed_at && (
                  <div className="col-md-6">
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Closed</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.closed_at)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <>
        <div className="ala-card">
          <div style={{ padding: 'var(--ala-space-5)' }}>
            <div className="row">
              <div className="col-md-6">
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Loan Number</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.loan_number ?? '—'}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Amount</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.amount)}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Term</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>
                    {loan.total_installments
                      ? `${loan.total_installments} installments (${loan.term_months ?? 0} months)`
                      : loan.term_months
                        ? `${loan.term_months} months`
                        : '—'}
                  </div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Interest Rate</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.interest_rate_per_month}% / mo</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Interest</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.total_interest)}</div>
                </div>
                {loan.old_balance_settlement > 0 && (
                  <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Old Balance Settlement</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.old_balance_settlement)}</div>
                  </div>
                )}
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Charges</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.charges)}</div>
                </div>
                {isReleased ? (
                  <>
                    <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                      <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Net Proceeds</small>
                      <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(originalNetProceeds)}</div>
                    </div>
                    <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                      <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Net Released</small>
                      <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.net_proceeds)}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Net Proceeds</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.net_proceeds)}</div>
                  </div>
                )}
                {loan.total_deductions > 0 && (
                  <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Total Deductions</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.total_deductions)}</div>
                  </div>
                )}
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Installment Amount</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatCurrency(loan.installment_amount)}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Total Installments</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.total_installments}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Guarantor</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.guarantor || '—'}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Loan Type</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500, textTransform: 'capitalize' }}>{loan.loan_type}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>First Payment Due</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.first_payment_due_date)}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Loan Status</small>
                  <div>
                    {loan.loan_status ? <StatusBadge status={loan.loan_status} /> : <span className="text-muted">—</span>}
                  </div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Application Status</small>
                  <div><StatusBadge status={loan.application_status} /></div>
                </div>
                {loan.collection_status && (
                  <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Collection Status</small>
                    <div><StatusBadge status={loan.collection_status} /></div>
                  </div>
                )}
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Approved At</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.approved_at)}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Released At</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.released_at)}</div>
                </div>
                <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                  <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Closed At</small>
                  <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{formatDate(loan.closed_at)}</div>
                </div>
                {loan.created_by_user && (
                  <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Created By</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.created_by_user.name}</div>
                  </div>
                )}
                {loan.approved_by_user && (
                  <div style={{ marginBottom: 'var(--ala-space-4)' }}>
                    <small style={{ color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-xs)' }}>Approved By</small>
                    <div style={{ fontSize: 'var(--ala-text-sm)', fontWeight: 500 }}>{loan.approved_by_user.name}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isReloanWithSettlement && !isReleased && (
          <div className="ala-card mt-4">
            <div className="ala-card-header">
              <i className="fa-solid fa-calculator me-2" />
              Net Process — Modified Net Proceeds
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td className="ps-3">Net Proceeds</td>
                    <td className="text-end pe-3">{formatCurrency(loan.net_proceeds)}</td>
                  </tr>
                  {loan.old_balance_settlement > 0 && (
                    <tr>
                      <td className="ps-3 text-warning">Less: Old Balance Settlement</td>
                      <td className="text-end pe-3 text-warning">−{formatCurrency(loan.old_balance_settlement)}</td>
                    </tr>
                  )}
                  {loan.charges > 0 && (
                    <tr>
                      <td className="ps-3 text-warning">Less: Charges</td>
                      <td className="text-end pe-3 text-warning">−{formatCurrency(loan.charges)}</td>
                    </tr>
                  )}
                  <tr className="border-top">
                    <td className="ps-3 fw-bold">Modified Net Proceeds</td>
                    <td className="text-end pe-3 fw-bold" style={{ color: modifiedNetProceeds > 0 ? 'var(--ala-primary-600)' : 'var(--ala-danger-600)' }}>
                      {formatCurrency(modifiedNetProceeds)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {modifiedNetProceeds <= 0 && (
              <div className="card-footer bg-danger-subtle text-danger" style={{ fontSize: 'var(--ala-text-sm)' }}>
                <i className="fa-solid fa-triangle-exclamation me-2" />
                The old balance exceeds the net proceeds. No cash will be released to the borrower — this reloan only settles the existing loan balance.
              </div>
            )}
          </div>
        )}
        </>
      )}

      {loan.parent_loan_id && activeTab === 'details' && (
        <div className="ala-card mt-4">
          <div className="ala-card-header">
            <i className="fa-solid fa-rotate me-2" />
            Reloan — Settled Parent Loan
          </div>
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Parent Loan</th>
                  <th>Principal</th>
                  <th>Charges</th>
                  <th>Settlement</th>
                </tr>
              </thead>
              <tbody>
                {(loan.settlements_as_reloan ?? []).filter((s) => s.status === 'completed').length > 0
                  ? (loan.settlements_as_reloan ?? [])
                      .filter((s) => s.status === 'completed')
                      .map((s) => (
                        <tr key={s.id}>
                          <td>
                            <Link to={`/loans/${s.old_loan_id}`}>Loan #{s.old_loan_id}</Link>
                          </td>
                          <td>{formatCurrency(s.principal_amount)}</td>
                          <td>{formatCurrency(s.charge_amount)}</td>
                          <td>{formatCurrency(s.settlement_amount)}</td>
                        </tr>
                      ))
                  : (
                    <tr>
                      <td>
                        <Link to={`/loans/${loan.parent_loan_id}`}>Loan #{loan.parent_loan_id}</Link>
                      </td>
                      <td>{formatCurrency(loan.old_balance_settlement)}</td>
                      <td>{formatCurrency(0)}</td>
                      <td>{formatCurrency(loan.old_balance_settlement)}</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'installments' && (
        <div className="ala-card">
          {loan.installments && loan.installments.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Due Date</th>
                    <th className="text-end">Amount</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Remaining</th>
                    <th>Status</th>
                    <th>Late Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.installments.map((inst) => (
                    <tr key={inst.id}>
                      <td className="fw-medium">{inst.installment_number}</td>
                      <td className="text-nowrap">
                        {formatDate(inst.due_date)}
                      </td>
                      <td className="text-end font-monospace">{formatCurrency(inst.amount)}</td>
                      <td className="text-end font-monospace">{formatCurrency(inst.paid_amount)}</td>
                      <td className="text-end font-monospace">
                        {formatCurrency(inst.amount - inst.paid_amount)}
                      </td>
                      <td><StatusBadge status={inst.status} /></td>
                      <td>
                        {inst.charges && inst.charges.length > 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--ala-warning-50)',
                              color: 'var(--ala-warning-600)',
                              fontSize: 'var(--ala-text-xs)',
                              fontWeight: 500,
                            }}
                          >
                            {inst.charges.length} fee{inst.charges.length > 1 ? 's' : ''}{' '}
                            ({formatCurrency(inst.charges.reduce((sum, f) => sum + f.balance, 0))})
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 'var(--ala-space-6)', textAlign: 'center', color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-sm)' }}>
              No installment schedule generated yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <>
        <div className="ala-card">
          <div style={{ padding: 'var(--ala-space-5)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 style={{ fontSize: 'var(--ala-text-base)', fontWeight: 600, margin: 0 }}>Payments</h5>
              {canRecordPayment && (
                <button className="btn btn-sm btn-primary" onClick={togglePaymentForm}>
                  {showPaymentForm ? 'Cancel' : 'Record Payment'}
                </button>
              )}
            </div>

            {showPaymentForm && (
              <form
                onSubmit={handleRecordPayment}
                style={{
                  marginBottom: 'var(--ala-space-5)',
                  padding: 'var(--ala-space-5)',
                  backgroundColor: 'var(--ala-gray-50)',
                  borderRadius: 'var(--ala-radius-md)',
                  border: '1px solid var(--ala-gray-200)',
                }}
              >
                {paymentError && (
                  <div className="alert alert-danger">{paymentError}</div>
                )}
                <div className="row g-2">
                  <div className="col-md-2">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={paymentForm.payment_date}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          payment_date: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          amount: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-select"
                      value={paymentForm.payment_method}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          payment_method: e.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Select method...</option>
                      {paymentMethods.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      value={paymentForm.notes}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Proof Image</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*" capture="environment"
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          proof_image: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-1 d-flex align-items-end">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={paymentLoading}
                    >
                      {paymentLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {loan.payments && loan.payments.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                    <th>Date</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Notes</th>
                      <th>Proof</th>
                      {canEditPayments && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loan.payments.map((payment, idx) =>
                      editingPaymentId === payment.id ? (
                        <tr key={payment.id}>
                          <td>{idx + 1}</td>
                          <td>
                            {formatDate(payment.payment_date)}
                          </td>
                          <td>{payment.payment_method}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editPaymentNotes}
                              onChange={(e) => setEditPaymentNotes(e.target.value)}
                            />
                          </td>
                          <td>
                            {payment.proof_image && !editPaymentRemoveProof && (
                              <div className="mb-1">
                                <a
                                  href={payment.proof_image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="me-2"
                                >
                                  Current
                                </a>
                                <a
                                  href="#"
                                  className="text-danger small"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEditPaymentRemoveProof(true);
                                  }}
                                >
                                  Remove
                                </a>
                              </div>
                            )}
                            {editPaymentRemoveProof && (
                              <small className="text-muted">Will be removed</small>
                            )}
                            <input
                              type="file"
                              className="form-control form-control-sm"
                              accept="image/*" capture="environment"
                              onChange={(e) => setEditPaymentProofFile(e.target.files?.[0] ?? null)}
                            />
                            {editPaymentProofFile && (
                              <small className="text-success">New file selected</small>
                            )}
                          </td>
                          {canEditPayments && (
                            <td>
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={savePaymentEdit}
                                  disabled={editPaymentSaving}
                                >
                                  {editPaymentSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={cancelPaymentEdit}
                                  disabled={editPaymentSaving}
                                >
                                  Cancel
                                </button>
                              </div>
                              {editPaymentError && (
                                <small className="text-danger d-block mt-1">{editPaymentError}</small>
                              )}
                            </td>
                          )}
                        </tr>
                      ) : (
                        <tr key={payment.id}>
                          <td>{idx + 1}</td>
                          <td>
                            {formatDate(payment.payment_date)}
                          </td>
                          <td>{payment.payment_method}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>{payment.notes || '—'}</td>
                          <td>
                            {payment.proof_image ? (
                              <a
                                href={payment.proof_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          {canEditPayments && (
                            <td>
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => openPaymentEdit(payment.id, payment.notes)}
                                >
                                  <i className="fa-solid fa-pen-to-square" />
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleDeletePayment(payment.id)}
                                >
                                  <i className="fa-solid fa-trash" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              !showPaymentForm && (
                <div style={{ padding: 'var(--ala-space-6)', textAlign: 'center', color: 'var(--ala-gray-500)', fontSize: 'var(--ala-text-sm)' }}>
                  No payments recorded.
                </div>
              )
            )}
          </div>
        </div>

        {loan.loan_status === 'settled_by_reloan' && (
          <div className="ala-card mt-4">
            <div className="ala-card-header">
              <i className="fa-solid fa-rotate me-2" />
              Settled By Reloan
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Reloan</th>
                    <th>Date</th>
                    <th>Principal</th>
                    <th>Charges</th>
                    <th>Settlement</th>
                  </tr>
                </thead>
                <tbody>
                  {(loan.settlements_as_old_loan ?? [])
                    .filter((s) => s.status === 'completed')
                    .map((s) => (
                      <tr key={s.id}>
                        <td>
                          <Link to={`/loans/${s.reloan_loan_id}`}>Loan #{s.reloan_loan_id}</Link>
                        </td>
                        <td>{formatDate(s.settlement_date)}</td>
                        <td>{formatCurrency(s.principal_amount)}</td>
                        <td>{formatCurrency(s.charge_amount)}</td>
                        <td>{formatCurrency(s.settlement_amount)}</td>
                      </tr>
                    ))}
                  {(loan.settlements_as_old_loan ?? []).filter((s) => s.status === 'completed').length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted">No completed reloan settlement recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
      )}

      {activeTab === 'release' && hasReleaseSources && (
        <div className="ala-card">
          <div style={{ padding: 'var(--ala-space-5)' }}>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th className="text-end">Amount</th>
                    <th>Notes</th>
                    <th>Proof</th>
                    {canEditReleaseSources && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {loan.release_sources!.map((src) =>
                    editingSourceId === src.id ? (
                      <tr key={src.id}>
                        <td>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={editMethod}
                            onChange={(e) => setEditMethod(e.target.value)}
                          >
                            <option value="">Select...</option>
                            {releaseMethods.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.name}{m.fee ? ` (Fee: ${formatCurrency(m.fee)})` : ''}
                              </option>
                            ))}
                          </select>
                          {(() => {
                            const method = releaseMethods.find(m => m.name === editMethod);
                            return method?.fee ? (
                              <small style={{ color: 'var(--ala-warning-600)', fontSize: 'var(--ala-text-xs)' }}>
                                Transfer fee: {formatCurrency(method.fee)}
                              </small>
                            ) : null;
                          })()}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </td>
                        <td>
                          {src.proof_image && !editRemoveProof && (
                            <div className="mb-1">
                              <a
                                href={src.proof_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="me-2"
                              >
                                Current
                              </a>
                              <a
                                href="#"
                                className="text-danger small"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditRemoveProof(true);
                                }}
                              >
                                Remove
                              </a>
                            </div>
                          )}
                          {editRemoveProof && (
                            <small className="text-muted">Will be removed</small>
                          )}
                          <input
                            type="file"
                            className="form-control form-control-sm"
                            accept="image/*" capture="environment"
                            onChange={(e) => setEditProofFile(e.target.files?.[0] ?? null)}
                          />
                          {editProofFile && (
                            <small className="text-success">New file selected</small>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={saveEdit}
                              disabled={editSaving}
                            >
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={cancelEdit}
                              disabled={editSaving}
                            >
                              Cancel
                            </button>
                          </div>
                          {editError && (
                            <small className="text-danger d-block mt-1">{editError}</small>
                          )}
                        </td>
                      </tr>
                    ) : (
                      <tr key={src.id}>
                        <td>{formatDate(src.release_date ?? null)}</td>
                        <td>{src.release_method}</td>
                        <td className="text-end font-monospace">{formatCurrency(src.amount)}</td>
                        <td>{src.notes || <span className="text-muted">—</span>}</td>
                        <td>
                          {src.proof_image ? (
                            <a
                              href={src.proof_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        {canEditReleaseSources && (
                          <td>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                               onClick={() =>
                                openEditSource(
                                  src.id,
                                  src.release_method,
                                  src.amount,
                                  src.notes,
                                  src.release_date,
                                )
                              }
                            >
                              <i className="fa-solid fa-pen-to-square" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {showRelease && (
              <div className="mt-4">
                <h6>Upload Proof for Source</h6>
                {loan.release_sources!.map((src, idx) => (
                  <div key={src.id} className="row g-2 mb-2 align-items-end">
                    <div className="col-md-4">
                      <small className="text-muted">{src.release_method} — {formatCurrency(src.amount)}</small>
                    </div>
                    <div className="col-md-4">
                      <input
                        type="file"
                        className="form-control form-control-sm"
                        accept="image/*" capture="environment"
                        onChange={(e) =>
                          setReleaseFiles((prev) => {
                            const next = new Map(prev);
                            next.set(idx, e.target.files?.[0] ?? null);
                            return next;
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showReleaseModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Release Loan</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowReleaseModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {actionError && (
                    <div className="alert alert-danger">{actionError}</div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 'var(--ala-space-4)',
                      marginBottom: 'var(--ala-space-5)',
                      padding: 'var(--ala-space-4)',
                      backgroundColor: 'var(--ala-gray-50)',
                      borderRadius: 'var(--ala-radius-md)',
                      border: '1px solid var(--ala-gray-200)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--ala-text-xs)',
                          color: 'var(--ala-gray-500)',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          marginBottom: 'var(--ala-space-1)',
                        }}
                      >
                        Actual Release
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--ala-text-xl)',
                          fontWeight: 700,
                          color: 'var(--ala-blue-700)',
                        }}
                      >
                        {formatCurrency(releaseNetPool)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--ala-text-xs)',
                          color: 'var(--ala-gray-500)',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          marginBottom: 'var(--ala-space-1)',
                        }}
                      >
                        To Be Allocated
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--ala-text-xl)',
                          fontWeight: 600,
                          color:
                            Math.abs(releaseRemaining) > 0.01
                              ? releaseRemaining > 0
                                ? 'var(--ala-success-600)'
                                : 'var(--ala-danger-600)'
                              : 'var(--ala-gray-500)',
                        }}
                      >
                        {formatCurrency(releaseRemaining)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 'var(--ala-space-5)' }}>
                    <div
                      style={{
                        fontSize: 'var(--ala-text-xs)',
                        color: 'var(--ala-gray-500)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        marginBottom: 'var(--ala-space-3)',
                      }}
                    >
                      Additional Fee
                    </div>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Charges (PHP)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={releaseCharges}
                          onChange={(e) => {
                            setReleaseCharges(e.target.value);
                            setReleaseSources((prev) =>
                              prev.map((src) => ({
                                ...src,
                                amount: '',
                              })),
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 'var(--ala-text-xs)',
                        color: 'var(--ala-gray-500)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        marginBottom: 'var(--ala-space-3)',
                      }}
                    >
                      Allocation Sources
                    </div>
                    <div className="table-responsive">
                      <table className="table release-sources-table">
                        <thead>
                          <tr>
                            <th style={{ width: '16%' }}>Date Release</th>
                            <th style={{ width: '16%' }}>Amount (PHP)</th>
                            <th style={{ width: '26%' }}>Payment Method</th>
                            <th style={{ width: '22%' }}>Notes</th>
                            <th style={{ width: '15%' }}>Proof</th>
                            <th style={{ width: '5%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {releaseSources.map((src, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="date"
                                  className="form-control"
                                  value={src.release_date}
                                  onChange={(e) =>
                                    updateReleaseSource(idx, 'release_date', e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  value={src.amount}
                                  onChange={(e) =>
                                    updateReleaseSource(idx, 'amount', e.target.value)
                                  }
                                  required
                                />
                              </td>
                              <td>
                                <select
                                  className="form-select"
                                  value={src.release_method}
                                  onChange={(e) =>
                                    updateReleaseSource(idx, 'release_method', e.target.value)
                                  }
                                  required
                                >
                                  <option value="">Select method...</option>
                                  {releaseMethods.map((m) => (
                                    <option key={m.id} value={m.name}>
                                      {m.name}
                                      {m.fee ? ` (Fee: ${formatCurrency(m.fee)})` : ''}
                                    </option>
                                  ))}
                                </select>
                                {(() => {
                                  const method = releaseMethods.find(
                                    (m) => m.name === src.release_method,
                                  );
                                  return method?.fee ? (
                                    <div
                                      style={{
                                        fontSize: 'var(--ala-text-xs)',
                                        color: 'var(--ala-warning-600)',
                                        marginTop: 'var(--ala-space-1)',
                                      }}
                                    >
                                      Fee: {formatCurrency(method.fee)}
                                    </div>
                                  ) : null;
                                })()}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={src.notes}
                                  onChange={(e) =>
                                    updateReleaseSource(idx, 'notes', e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="file"
                                  className="form-control"
                                  accept="image/*" capture="environment"
                                  onChange={(e) =>
                                    setReleaseFiles((prev) => {
                                      const next = new Map(prev);
                                      next.set(idx, e.target.files?.[0] ?? null);
                                      return next;
                                    })
                                  }
                                />
                                {releaseFiles.get(idx) && (
                                  <div
                                    style={{
                                      fontSize: 'var(--ala-text-xs)',
                                      color: 'var(--ala-gray-500)',
                                      marginTop: 'var(--ala-space-1)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {releaseFiles.get(idx)!.name}
                                  </div>
                                )}
                              </td>
                              <td className="text-center align-middle">
                                {releaseSources.length > 1 && (
                                  <button
                                    type="button"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--ala-gray-400)',
                                      cursor: 'pointer',
                                      fontSize: 'var(--ala-text-xl)',
                                      padding: 0,
                                      lineHeight: 1,
                                      transition: 'color var(--ala-transition-fast)',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = 'var(--ala-danger-600)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = 'var(--ala-gray-400)';
                                    }}
                                    onClick={() => removeReleaseSource(idx)}
                                    title="Remove source"
                                  >
                                    &times;
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {releaseRemaining > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm w-100"
                      onClick={addReleaseSource}
                      style={{ marginTop: 'var(--ala-space-3)' }}
                    >
                      + Add Source
                    </button>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setShowReleaseModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={submitRelease}
                    disabled={
                      actionLoading ||
                      Math.abs(releaseRemaining) > 0.01 ||
                      releaseSources.some(
                        (s) => !s.release_method || !parseFloat(s.amount),
                      )
                    }
                  >
                    {actionLoading ? 'Releasing...' : 'Release'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showApproveModal && (
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
                    onClick={() => setShowApproveModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <p className="text-muted" style={{ fontSize: 'var(--ala-text-sm)' }}>
                    Leave fields blank to keep current values.
                  </p>
                  <div className="mb-3">
                    <label className="form-label">Amount (PHP)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={approveData.amount}
                      onChange={(e) =>
                        setApproveData((d) => ({
                          ...d,
                          amount: e.target.value,
                        }))
                      }
                      placeholder={loan.amount.toString()}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Interest Rate (% / mo)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={approveData.interest_rate_per_month}
                      onChange={(e) =>
                        setApproveData((d) => ({
                          ...d,
                          interest_rate_per_month: e.target.value,
                        }))
                      }
                      placeholder={loan.interest_rate_per_month.toString()}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Term (months)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.5"
                      min={0.5}
                      max={5}
                      value={approveData.term_months}
                      onChange={(e) =>
                        setApproveData((d) => ({
                          ...d,
                          term_months: e.target.value,
                        }))
                      }
                      placeholder={loan.term_months?.toString() ?? ''}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setShowApproveModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={doApprove}
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

      {confirmAction && (
        <ConfirmModal
          show={showConfirmModal}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmVariant={confirmAction.confirmVariant ?? 'primary'}
          confirmLabel={confirmAction.confirmLabel ?? 'Confirm'}
          onConfirm={async () => {
            await confirmAction.onConfirm();
            setShowConfirmModal(false);
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      <style>{`
        .ala-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--ala-space-4);
          margin-bottom: var(--ala-space-6);
          flex-wrap: wrap;
        }
        .ala-page-header-left {
          min-width: 0;
        }
        .ala-page-header-actions {
          display: flex;
          align-items: center;
          gap: var(--ala-space-2);
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .ala-breadcrumbs {
          display: flex;
          align-items: center;
          gap: var(--ala-space-2);
          font-size: var(--ala-text-xs);
          margin-bottom: var(--ala-space-2);
          flex-wrap: wrap;
        }
        .ala-breadcrumb-link {
          color: var(--ala-gray-600);
          text-decoration: none;
        }
        .ala-breadcrumb-link:hover {
          color: var(--ala-blue-700);
        }
        .ala-breadcrumb-current {
          color: var(--ala-gray-800);
          font-weight: 500;
        }
        .ala-breadcrumb-sep {
          font-size: 0.5625rem;
          color: var(--ala-gray-400);
          margin: 0 var(--ala-space-1);
        }
        .ala-loan-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--ala-space-4);
          margin-bottom: var(--ala-space-6);
        }
        @media (max-width: 991.98px) {
          .ala-loan-summary {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 575.98px) {
          .ala-loan-summary {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .ala-summary-item {
          background: var(--ala-white);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-lg);
          padding: var(--ala-space-4) var(--ala-space-5);
          text-align: center;
        }
        .ala-summary-label {
          font-size: var(--ala-text-xs);
          color: var(--ala-gray-500);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--ala-space-1);
        }
        .ala-summary-value {
          font-size: var(--ala-text-lg);
          font-weight: 700;
          color: var(--ala-gray-900);
        }
        .ala-tabs {
          display: flex;
          gap: 1px;
          border-bottom: 2px solid var(--ala-gray-300);
          margin-bottom: var(--ala-space-5);
        }
        .ala-tab {
          padding: var(--ala-space-3) var(--ala-space-5);
          border: none;
          background: none;
          font-size: var(--ala-text-sm);
          font-weight: 500;
          color: var(--ala-gray-600);
          cursor: pointer;
          transition: all var(--ala-transition-fast);
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }
        .ala-tab:hover {
          color: var(--ala-gray-800);
        }
        .ala-tab.active {
          color: var(--ala-blue-700);
          border-bottom-color: var(--ala-blue-700);
          font-weight: 600;
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
        .release-sources-table td,
        .release-sources-table th {
          padding-left: var(--ala-space-4);
          padding-right: var(--ala-space-4);
        }
      `}</style>
    </div>
  );
}
