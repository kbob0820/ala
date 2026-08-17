import { useState, type FormEvent } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ala-auth-page">
      <div className="ala-auth-card">
        <div className="ala-auth-brand">
          <div className="ala-auth-logo">
            <i className="fa-solid fa-building-columns" />
          </div>
          <h1 className="ala-auth-title">AJang Loan</h1>
          <p className="ala-auth-subtitle">Management System</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center">
            <i className="fa-solid fa-circle-exclamation me-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="ala-auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Register here</Link>
        </div>
      </div>

      <style>{`
        .ala-auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--ala-gray-50);
          padding: var(--ala-space-4);
        }
        .ala-auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--ala-white);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-lg);
          padding: var(--ala-space-8);
        }
        .ala-auth-brand {
          text-align: center;
          margin-bottom: var(--ala-space-6);
        }
        .ala-auth-logo {
          width: 48px;
          height: 48px;
          border-radius: var(--ala-radius-md);
          background: var(--ala-navy-900);
          color: var(--ala-white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.375rem;
          margin: 0 auto var(--ala-space-3);
        }
        .ala-auth-title {
          font-size: var(--ala-text-2xl);
          font-weight: 700;
          color: var(--ala-gray-900);
          margin: 0 0 var(--ala-space-1);
        }
        .ala-auth-subtitle {
          font-size: var(--ala-text-xs);
          color: var(--ala-gray-500);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0;
          font-weight: 500;
        }
        .ala-auth-footer {
          text-align: center;
          margin-top: var(--ala-space-5);
          padding-top: var(--ala-space-5);
          border-top: 1px solid var(--ala-gray-200);
          font-size: var(--ala-text-sm);
          color: var(--ala-gray-600);
        }
        .ala-auth-footer a {
          font-weight: 500;
        }
        @media (max-width: 575.98px) {
          .ala-auth-card {
            padding: var(--ala-space-5);
          }
        }
      `}</style>
    </div>
  );
}
