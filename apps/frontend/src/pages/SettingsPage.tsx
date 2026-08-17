import { useState, useEffect, type FormEvent } from 'react';
import { getSettings, updateSettings } from '@/services/settingsService';
import { PaymentTypesPage } from '@/pages/PaymentTypesPage';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'loans' | 'payment_types'>('loans');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [graceDays, setGraceDays] = useState('');

  useEffect(() => {
    getSettings()
      .then((data) => {
        setLateFeeAmount(String(data.late_fee_amount));
        setGraceDays(String(data.late_fee_grace_days));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amount = parseFloat(lateFeeAmount);
    const grace = parseInt(graceDays, 10);

    if (Number.isNaN(amount) || amount < 0) {
      setError('Please enter a valid late fee amount.');
      return;
    }
    if (Number.isNaN(grace) || grace < 0) {
      setError('Please enter a valid grace period.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSettings({
        late_fee_amount: amount,
        late_fee_grace_days: grace,
      });
      setLateFeeAmount(String(updated.late_fee_amount));
      setGraceDays(String(updated.late_fee_grace_days));
      setSuccess('Settings updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
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

  return (
    <div>
      <h1 className="mb-1">Settings</h1>
      <p className="text-muted">Configure system preferences</p>

      <ul className="ala-tabs mb-4">
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'loans' ? 'active' : ''}`}
            onClick={() => setActiveTab('loans')}
          >
            Loan Settings
          </button>
        </li>
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'payment_types' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment_types')}
          >
            Payment Types
          </button>
        </li>
      </ul>

      {activeTab === 'loans' && (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="ala-card">
            <div className="card-header">
              <h5 className="mb-0">Past Due &amp; Late Fee Rules</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Default Late Fee (PHP)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <div className="form-text">
                    Assessed once per overdue payment schedule.
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Grace Period (days)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={graceDays}
                    onChange={(e) => setGraceDays(e.target.value)}
                    min="0"
                    step="1"
                  />
                  <div className="form-text">
                    Days after the due date before a schedule becomes past due.
                  </div>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {activeTab === 'payment_types' && <PaymentTypesPage />}
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
