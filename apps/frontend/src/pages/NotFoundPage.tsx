import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="display-1 text-muted">404</h1>
      <h2 className="mb-3">Page Not Found</h2>
      <p className="text-muted mb-4">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link to="/" className="btn btn-primary">
        Go to Dashboard
      </Link>
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
