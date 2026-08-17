import { useState, useEffect, useCallback } from 'react';
import {
  getPaymentTypes,
  createPaymentType,
  updatePaymentType,
  deletePaymentType,
} from '@/services/paymentTypeService';
import { Pagination } from '@/components/Pagination';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { PaymentType, PaginatedResponse } from '@/types';

export function PaymentTypesPage() {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [activeTab, setActiveTab] = useState<'payment_method' | 'release_method'>('payment_method');

  const [newName, setNewName] = useState('');
  const [newFee, setNewFee] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PaymentType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPaymentTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result: PaginatedResponse<PaymentType> = await getPaymentTypes({
        per_page: 15,
        page: currentPage,
      });

      setPaymentTypes(result.data);
      setLastPage(result.meta.last_page);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load payment types';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchPaymentTypes();
  }, [fetchPaymentTypes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      await createPaymentType({
        name: newName.trim(),
        category: activeTab,
        is_active: newIsActive,
        fee: newFee ? parseFloat(newFee) : null,
      });
      setNewName('');
      setNewFee('');
      setNewIsActive(true);
      await fetchPaymentTypes();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create payment type',
      );
    } finally {
      setCreateLoading(false);
    }
  }

  function startEdit(pt: PaymentType) {
    setEditingId(pt.id);
    setEditName(pt.name);
    setEditFee(pt.fee != null ? pt.fee.toString() : '');
    setEditIsActive(pt.is_active);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return;

    setEditLoading(true);

    try {
      await updatePaymentType(id, {
        name: editName.trim(),
        category: activeTab,
        is_active: editIsActive,
        fee: editFee ? parseFloat(editFee) : null,
      });
      setEditingId(null);
      await fetchPaymentTypes();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update payment type';
      setError(message);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteLoading(true);

    try {
      await deletePaymentType(deleteTarget.id);
      setDeleteTarget(null);
      await fetchPaymentTypes();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete payment type',
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  const filteredItems = paymentTypes.filter((pt) => pt.category === activeTab);

  return (
    <div>
      <ul className="ala-tabs mb-4">
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'payment_method' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment_method')}
          >
            Payment Method
          </button>
        </li>
        <li className="ala-tab">
          <button
            className={`nav-link ${activeTab === 'release_method' ? 'active' : ''}`}
            onClick={() => setActiveTab('release_method')}
          >
            Release Method
          </button>
        </li>
      </ul>

      <form onSubmit={handleCreate} className="mb-4">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              placeholder={`${activeTab === 'payment_method' ? 'Payment' : 'Release'} method name`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="col-md-2">
            <div className="form-check mt-2">
              <input
                id="create-active"
                type="checkbox"
                className="form-check-input"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="create-active">
                Active
              </label>
            </div>
          </div>
          <div className="col-md-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createLoading}
            >
              {createLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
        {createError && (
          <div className="alert alert-danger mt-2 mb-0">{createError}</div>
        )}
      </form>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <div className="text-center py-5 text-muted">
          No {activeTab === 'payment_method' ? 'payment' : 'release'} methods found
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                {filteredItems.map((pt, idx) => (
                  <tr key={pt.id}>
                    <td>{(currentPage - 1) * 15 + idx + 1}</td>
                    <td>
                      {editingId === pt.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        pt.name
                      )}
                    </td>
                    <td>
                      {editingId === pt.id ? (
                        <div className="form-check">
                          <input
                            id={`edit-active-${pt.id}`}
                            type="checkbox"
                            className="form-check-input"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`edit-active-${pt.id}`}
                          >
                            Active
                          </label>
                        </div>
                      ) : (
                        <span
                          className={`badge bg-${pt.is_active ? 'success' : 'secondary'}`}
                        >
                          {pt.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingId === pt.id ? (
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUpdate(pt.id)}
                            disabled={editLoading}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => startEdit(pt)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(pt)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {deleteTarget && (
        <ConfirmModal
          show={true}
          title="Delete Payment Type"
          message={`Are you sure you want to delete "${deleteTarget.name}"?`}
          confirmVariant="danger"
          confirmLabel={deleteLoading ? 'Deleting...' : 'Delete'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
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
