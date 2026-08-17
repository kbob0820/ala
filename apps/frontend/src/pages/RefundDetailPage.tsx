import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { RefundLedger } from '@/components/RefundLedger';
import {
  getRefund,
  verifyRefund,
  approveRefund,
  releaseRefund,
  rejectRefund,
} from '@/services/refundService';
import type { Refund } from '@/types';

const RELEASE_METHODS = ['Cash', 'GCash', 'Bank Transfer'] as const;

export default function RefundDetailPage() {
  const { refundId } = useParams<{ refundId: string }>();
  const [refund, setRefund] = useState<Refund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseMethod, setReleaseMethod] = useState('Cash');
  const [releaseNotes, setReleaseNotes] = useState('');

  const fetchRefund = useCallback(async () => {
    if (!refundId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getRefund(Number(refundId));
      setRefund(data);
    } catch {
      setError('Failed to load refund details.');
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    fetchRefund();
  }, [fetchRefund]);

  const handleAction = async (
    action: 'verify' | 'approve' | 'reject' | 'release',
  ) => {
    if (!refund) return;
    setActionLoading(action);
    setAlert(null);
    try {
      let updated: Refund;
      switch (action) {
        case 'verify':
          updated = await verifyRefund(refund.id);
          break;
        case 'approve':
          updated = await approveRefund(refund.id);
          break;
        case 'reject':
          updated = await rejectRefund(refund.id);
          break;
        case 'release':
          updated = await releaseRefund(refund.id, { release_method: releaseMethod, notes: releaseNotes || undefined });
          setShowReleaseModal(false);
          break;
      }
      setRefund(updated);
      setAlert({ type: 'success', message: `Refund ${action === 'release' ? 'released' : action + 'ed'} successfully.` });
    } catch {
      setAlert({ type: 'danger', message: `Failed to ${action} refund.` });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || 'Refund not found.'}
      </div>
    );
  }

  const status = refund.status;

  return (
    <div>
      <Link to="/refunds" className="btn btn-outline-secondary btn-sm mb-3">
        <i className="fa-solid fa-arrow-left me-1" />
        Back to Refunds
      </Link>

      <div className="d-flex align-items-center gap-2 mb-3">
        <h4 className="mb-0">Refund #{refund.id}</h4>
        <StatusBadge status={status} />
      </div>

      <div className="alert alert-info mb-4" role="alert">
        <i className="fa-solid fa-circle-info me-2" />
        Refunds follow a request, verification, approval and release workflow. All actions are audit logged.
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setAlert(null)}
          />
        </div>
      )}

      <RefundLedger refund={refund} />

      <div className="ala-card mt-4">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="fa-solid fa-bolt me-2" />
            Actions
          </h6>
        </div>
        <div className="card-body">
          {status === 'requested' && (
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                disabled={actionLoading != null}
                onClick={() => handleAction('verify')}
              >
                {actionLoading === 'verify' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check me-1" />
                    Verify
                  </>
                )}
              </button>
              <button
                className="btn btn-danger"
                disabled={actionLoading != null}
                onClick={() => handleAction('reject')}
              >
                {actionLoading === 'reject' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-xmark me-1" />
                    Reject
                  </>
                )}
              </button>
            </div>
          )}

          {status === 'verified' && (
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                disabled={actionLoading != null}
                onClick={() => handleAction('approve')}
              >
                {actionLoading === 'approve' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Approving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check me-1" />
                    Approve
                  </>
                )}
              </button>
              <button
                className="btn btn-danger"
                disabled={actionLoading != null}
                onClick={() => handleAction('reject')}
              >
                {actionLoading === 'reject' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-xmark me-1" />
                    Reject
                  </>
                )}
              </button>
            </div>
          )}

          {status === 'approved' && (
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                disabled={actionLoading != null}
                onClick={() => setShowReleaseModal(true)}
              >
                {actionLoading === 'release' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane me-1" />
                    Release
                  </>
                )}
              </button>
            </div>
          )}

          {(status === 'released' || status === 'completed' || status === 'rejected') && (
            <p className="text-muted mb-0">
              <i className="fa-solid fa-circle-info me-1" />
              Refund is {status}.
            </p>
          )}
        </div>
      </div>

      {showReleaseModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Release Refund #{refund.id}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowReleaseModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Release Method</label>
                    <select
                      className="form-select"
                      value={releaseMethod}
                      onChange={(e) => setReleaseMethod(e.target.value)}
                    >
                      {RELEASE_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                      placeholder="Optional release notes..."
                    />
                  </div>
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
                    disabled={actionLoading != null}
                    onClick={() => handleAction('release')}
                  >
                    {actionLoading === 'release' ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
