import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="ala-page-header">
      <div className="ala-page-header-left">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="ala-breadcrumbs" aria-label="breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i}>
                {i > 0 && (
                  <i className="fa-solid fa-chevron-right ala-breadcrumb-sep" />
                )}
                {crumb.to ? (
                  <Link to={crumb.to} className="ala-breadcrumb-link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="ala-breadcrumb-current">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="ala-page-title">{title}</h1>
      </div>
      {actions && <div className="ala-page-header-actions">{actions}</div>}

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
          gap: var(--ala-space-3);
          flex-shrink: 0;
        }

        .ala-page-title {
          font-size: var(--ala-text-4xl);
          font-weight: 700;
          color: var(--ala-gray-900);
          margin: 0;
          line-height: 1.3;
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
          transition: color var(--ala-transition-fast);
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

        @media (max-width: 767.98px) {
          .ala-page-header {
            flex-direction: column;
            align-items: stretch;
          }
          .ala-page-header-actions {
            justify-content: flex-start;
          }
          .ala-page-title {
            font-size: var(--ala-text-3xl);
          }
        }
      `}</style>
    </div>
  );
}
