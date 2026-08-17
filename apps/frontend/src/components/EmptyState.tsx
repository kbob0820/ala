import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
}

export function EmptyState({
  icon = 'fa-solid fa-inbox',
  title,
  description,
  actionLabel,
  actionTo,
}: EmptyStateProps) {
  return (
    <div className="ala-empty-state">
      <div className="ala-empty-icon">
        <i className={icon} />
      </div>
      <h3 className="ala-empty-title">{title}</h3>
      {description && <p className="ala-empty-desc">{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary">
          {actionLabel}
        </Link>
      )}

      <style>{`
        .ala-empty-state {
          text-align: center;
          padding: var(--ala-space-10) var(--ala-space-4);
        }
        .ala-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--ala-gray-100);
          color: var(--ala-gray-400);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto var(--ala-space-4);
        }
        .ala-empty-title {
          font-size: var(--ala-text-lg);
          font-weight: 600;
          color: var(--ala-gray-700);
          margin-bottom: var(--ala-space-2);
        }
        .ala-empty-desc {
          font-size: var(--ala-text-sm);
          color: var(--ala-gray-500);
          margin-bottom: var(--ala-space-5);
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }
      `}</style>
    </div>
  );
}
