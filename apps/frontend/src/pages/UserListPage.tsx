import { useState, useEffect, useCallback } from 'react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '@/services/userService';
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import type { User, PaginatedResponse } from '@/types';

interface CreateForm {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: string;
}

interface EditForm {
  name: string;
  email: string;
  role_id: string;
  is_active: boolean;
  password: string;
  password_confirmation: string;
}

const emptyCreateForm: CreateForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role_id: '',
};

const emptyEditForm: EditForm = {
  name: '',
  email: '',
  role_id: '',
  is_active: true,
  password: '',
  password_confirmation: '',
};

export function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result: PaginatedResponse<User> = await getUsers({
        per_page: 15,
        page: currentPage,
      });

      setUsers(result.data);
      setLastPage(result.meta.last_page);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load users';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreateModal() {
    setCreateForm(emptyCreateForm);
    setCreateError(null);
    setShowCreateModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      await createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        password_confirmation: createForm.password_confirmation,
        role_id: createForm.role_id ? Number(createForm.role_id) : null,
      });
      setShowCreateModal(false);
      await fetchUsers();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create user',
      );
    } finally {
      setCreateLoading(false);
    }
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role_id: user.role_id ? String(user.role_id) : '',
      is_active: user.is_active,
      password: '',
      password_confirmation: '',
    });
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser || !editForm.name.trim() || !editForm.email.trim()) return;

    setEditLoading(true);
    setEditError(null);

    const data: {
      name: string;
      email: string;
      role_id: number | null;
      is_active: boolean;
      password?: string;
      password_confirmation?: string;
    } = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role_id: editForm.role_id ? Number(editForm.role_id) : null,
      is_active: editForm.is_active,
    };

    if (editForm.password) {
      data.password = editForm.password;
      data.password_confirmation = editForm.password_confirmation;
    }

    try {
      await updateUser(editingUser.id, data);
      setShowEditModal(false);
      await fetchUsers();
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : 'Failed to update user',
      );
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteLoading(true);

    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete user',
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        breadcrumbs={[{ label: 'Users' }]}
        actions={
          <button className="btn btn-primary" onClick={openCreateModal}>
            <i className="fa-solid fa-plus me-1" />
            New User
          </button>
        }
      />

      {error && (
        <div className="alert alert-danger alert-dismissible d-flex align-items-center">
          <i className="fa-solid fa-circle-exclamation me-2" />
          {error}
          <button
            type="button"
            className="btn-close ms-auto"
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

      {!loading && !error && users.length === 0 && (
        <EmptyState
          icon="fa-solid fa-users-cog"
          title="No users found"
          description="Create the first user to get started"
          actionLabel="New User"
        />
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <div className="ala-card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id}>
                      <td className="text-muted">{(currentPage - 1) * 15 + idx + 1}</td>
                      <td className="fw-medium">{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        {user.role ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--ala-blue-50)',
                              color: 'var(--ala-blue-700)',
                              fontSize: 'var(--ala-text-xs)',
                              fontWeight: 500,
                            }}
                          >
                            {user.role.name}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            backgroundColor: user.is_active ? 'var(--ala-success-50)' : 'var(--ala-gray-100)',
                            color: user.is_active ? 'var(--ala-success-600)' : 'var(--ala-gray-600)',
                            fontSize: 'var(--ala-text-xs)',
                            fontWeight: 500,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: user.is_active ? 'var(--ala-success-600)' : 'var(--ala-gray-500)',
                            }}
                          />
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(user)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {showCreateModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">New User</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCreateModal(false)}
                  />
                </div>
                <form onSubmit={handleCreate}>
                  <div className="modal-body">
                    {createError && (
                      <div className="alert alert-danger">{createError}</div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={createForm.name}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, password: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Confirm Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={createForm.password_confirmation}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, password_confirmation: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        value={createForm.role_id}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, role_id: e.target.value }))
                        }
                      >
                        <option value="">No Role</option>
                        <option value="1">Administrator</option>
                        <option value="2">Loan Officer</option>
                        <option value="3">Approver</option>
                        <option value="4">Cashier</option>
                        <option value="5">Collector</option>
                        <option value="6">Auditor</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={createLoading}
                    >
                      {createLoading ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showEditModal && editingUser && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit User</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowEditModal(false)}
                  />
                </div>
                <form onSubmit={handleUpdate}>
                  <div className="modal-body">
                    {editError && (
                      <div className="alert alert-danger">{editError}</div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        value={editForm.role_id}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, role_id: e.target.value }))
                        }
                      >
                        <option value="">No Role</option>
                        <option value="1">Administrator</option>
                        <option value="2">Loan Officer</option>
                        <option value="3">Approver</option>
                        <option value="4">Cashier</option>
                        <option value="5">Collector</option>
                        <option value="6">Auditor</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          id="edit-active"
                          type="checkbox"
                          className="form-check-input"
                          checked={editForm.is_active}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, is_active: e.target.checked }))
                          }
                        />
                        <label className="form-check-label" htmlFor="edit-active">
                          Active
                        </label>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        New Password{' '}
                        <small className="text-muted">(leave blank to keep)</small>
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, password: e.target.value }))
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={editForm.password_confirmation}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, password_confirmation: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={editLoading}
                    >
                      {editLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteTarget && (
        <ConfirmModal
          show={true}
          title="Delete User"
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
