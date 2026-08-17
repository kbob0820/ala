import { useState, type FormEvent } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import type { ApiErrorResponse } from '@/types';

interface FieldErrors {
  name?: string[];
  email?: string[];
  password?: string[];
}

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await register(name, email, password, passwordConfirmation);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const data = err.response.data as ApiErrorResponse;
        if (data.error?.details) {
          setFieldErrors({
            name: data.error.details.name,
            email: data.error.details.email,
            password: data.error.details.password,
          });
        }
        if (data.error?.message) {
          setError(data.error.message);
        }
      } else {
        const message =
          err instanceof Error ? err.message : 'Registration failed. Please try again.';
        setError(message);
      }
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
          <p className="ala-auth-subtitle">Create your account</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center">
            <i className="fa-solid fa-circle-exclamation me-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name</label>
            <input
              id="name"
              type="text"
              className={`form-control${fieldErrors.name ? ' is-invalid' : ''}`}
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
              required
              autoFocus
            />
            {fieldErrors.name && (
              <div className="invalid-feedback">{fieldErrors.name.join(' ')}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
              required
            />
            {fieldErrors.email && (
              <div className="invalid-feedback">{fieldErrors.email.join(' ')}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
              required
            />
            {fieldErrors.password && (
              <div className="invalid-feedback">{fieldErrors.password.join(' ')}</div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="password_confirmation" className="form-label">Confirm Password</label>
            <input
              id="password_confirmation"
              type="password"
              className="form-control"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
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
                Creating account...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="ala-auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in here</Link>
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
