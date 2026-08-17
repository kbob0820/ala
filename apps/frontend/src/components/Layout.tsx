import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  administrator: [
    { to: '/', icon: 'fa-solid fa-gauge', label: 'Dashboard' },
    { to: '/clients', icon: 'fa-solid fa-address-book', label: 'Clients' },
    { to: '/loans/calculator', icon: 'fa-solid fa-calculator', label: 'Calculator' },
    { to: '/loans', icon: 'fa-solid fa-file-invoice', label: 'Loans' },
    { to: '/reloan', icon: 'fa-solid fa-rotate', label: 'Reloan' },
    { to: '/loans/approve', icon: 'fa-solid fa-clipboard-check', label: 'Approvals' },
    { to: '/past-due', icon: 'fa-solid fa-clock', label: 'Past Due' },
    { to: '/reports', icon: 'fa-solid fa-chart-bar', label: 'Reports' },
    { to: '/refunds', icon: 'fa-solid fa-hand-holding-dollar', label: 'Refunds' },
    { to: '/payments', icon: 'fa-solid fa-money-bill-wave', label: 'Payments' },
    { to: '/users', icon: 'fa-solid fa-users-cog', label: 'Users' },
    { to: '/settings', icon: 'fa-solid fa-gear', label: 'Settings' },
  ],
  loan_officer: [
    { to: '/', icon: 'fa-solid fa-gauge', label: 'Dashboard' },
    { to: '/clients', icon: 'fa-solid fa-address-book', label: 'Clients' },
    { to: '/loans/calculator', icon: 'fa-solid fa-calculator', label: 'Calculator' },
    { to: '/loans', icon: 'fa-solid fa-file-invoice', label: 'Loans' },
    { to: '/reloan', icon: 'fa-solid fa-rotate', label: 'Reloan' },
  ],
  approver: [
    { to: '/', icon: 'fa-solid fa-gauge', label: 'Dashboard' },
    { to: '/clients', icon: 'fa-solid fa-address-book', label: 'Clients' },
    { to: '/loans/calculator', icon: 'fa-solid fa-calculator', label: 'Calculator' },
    { to: '/loans/approve', icon: 'fa-solid fa-clipboard-check', label: 'Approvals' },
    { to: '/loans', icon: 'fa-solid fa-file-invoice', label: 'Loans' },
    { to: '/past-due', icon: 'fa-solid fa-clock', label: 'Past Due' },
  ],
  cashier: [
    { to: '/', icon: 'fa-solid fa-gauge', label: 'Dashboard' },
    { to: '/loans', icon: 'fa-solid fa-file-invoice', label: 'Loans' },
    { to: '/refunds', icon: 'fa-solid fa-hand-holding-dollar', label: 'Refunds' },
    { to: '/payments', icon: 'fa-solid fa-money-bill-wave', label: 'Payments' },
  ],
  collector: [
    { to: '/', icon: 'fa-solid fa-gauge', label: 'Dashboard' },
    { to: '/past-due', icon: 'fa-solid fa-clock', label: 'Past Due' },
  ],
  auditor: [
    { to: '/', icon: 'fa-solid fa-gauge', label: 'Dashboard' },
    { to: '/clients', icon: 'fa-solid fa-address-book', label: 'Clients' },
    { to: '/loans', icon: 'fa-solid fa-file-invoice', label: 'Loans' },
    { to: '/past-due', icon: 'fa-solid fa-clock', label: 'Past Due' },
    { to: '/reports', icon: 'fa-solid fa-chart-bar', label: 'Reports' },
    { to: '/refunds', icon: 'fa-solid fa-hand-holding-dollar', label: 'Refunds' },
    { to: '/payments', icon: 'fa-solid fa-money-bill-wave', label: 'Payments' },
  ],
  borrower: [
    { to: '/', icon: 'fa-solid fa-gauge', label: 'Dashboard' },
    { to: '/loans', icon: 'fa-solid fa-file-invoice', label: 'My Loans' },
    { to: '/payments', icon: 'fa-solid fa-money-bill-wave', label: 'Payments' },
  ],
};

const ROLE_STYLE: Record<string, string> = {
  administrator: '#3b82f6',
  loan_officer: '#16a34a',
  approver: '#c8960c',
  cashier: '#0284c7',
  collector: '#dc2626',
  auditor: '#6b7280',
  borrower: '#8b5cf6',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const roleSlug = user?.role?.slug ?? '';
  const navItems = NAV_BY_ROLE[roleSlug] ?? NAV_BY_ROLE.administrator;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColor = ROLE_STYLE[roleSlug] ?? '#6b7280';

  function isLinkActive(item: NavItem): boolean {
    if (item.to === '/') return location.pathname === '/';
    if (item.to === '/loans') {
      const loansSubpaths = ['/loans/calculator', '/loans/approve', '/reloan/calculate'];
      if (loansSubpaths.some(sp => location.pathname.startsWith(sp))) return false;
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  }

  return (
    <div className="ala-layout">
      <button
        className="ala-sidebar-toggle d-lg-none"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation"
      >
        <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`} />
      </button>

      {sidebarOpen && (
        <div
          className="ala-sidebar-overlay d-lg-none"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`ala-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ala-sidebar-brand">
          <div className="ala-sidebar-logo">
            <i className="fa-solid fa-building-columns" />
          </div>
          <div className="ala-sidebar-title">
            <span className="ala-sidebar-name">AJang Loan</span>
            <span className="ala-sidebar-subtitle">Management System</span>
          </div>
        </div>

        <nav className="ala-sidebar-nav">
          {navItems.map((item) => {
            const active = isLinkActive(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={() =>
                  `ala-nav-item ${isLinkActive(item) ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <i className={`${item.icon} ala-nav-icon`} />
                <span>{item.label}</span>
                {active && <span className="ala-nav-indicator" style={{ backgroundColor: roleColor }} />}
              </NavLink>
            );
          })}
        </nav>

        <div className="ala-sidebar-footer">
          <div className="ala-sidebar-user">
            <div className="ala-user-avatar">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="ala-user-info">
              <div className="ala-user-name">{user?.name ?? 'User'}</div>
              <div className="ala-user-role" style={{ color: roleColor }}>
                {user?.role?.name ?? 'No Role'}
              </div>
            </div>
          </div>
          <button
            className="ala-logout-btn"
            onClick={handleLogout}
            title="Sign Out"
          >
            <i className="fa-solid fa-right-from-bracket" />
          </button>
        </div>
      </aside>

      <main className="ala-main">
        <div className="ala-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        .ala-layout {
          display: flex;
          min-height: 100vh;
          background-color: var(--ala-gray-50);
        }

        .ala-sidebar-toggle {
          display: none;
          position: fixed;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 1060;
          width: 40px;
          height: 40px;
          border-radius: var(--ala-radius-md);
          border: 1px solid var(--ala-gray-300);
          background: var(--ala-white);
          color: var(--ala-gray-700);
          font-size: 1.125rem;
          cursor: pointer;
          box-shadow: var(--ala-shadow-md);
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 991.98px) {
          .ala-sidebar-toggle {
            display: flex;
          }
        }

        .ala-sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 22, 40, 0.4);
          z-index: 1050;
        }

        .ala-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: var(--ala-sidebar-width);
          background: var(--ala-navy-900);
          display: flex;
          flex-direction: column;
          z-index: 1055;
          overflow-y: auto;
          transition: transform var(--ala-transition-normal);
        }
        @media (max-width: 991.98px) {
          .ala-sidebar {
            transform: translateX(-100%);
          }
          .ala-sidebar.open {
            transform: translateX(0);
          }
        }

        .ala-sidebar-brand {
          padding: var(--ala-space-5) var(--ala-space-5) var(--ala-space-4);
          display: flex;
          align-items: center;
          gap: var(--ala-space-3);
          border-bottom: 1px solid var(--ala-navy-700);
        }

        .ala-sidebar-logo {
          width: 40px;
          height: 40px;
          border-radius: var(--ala-radius-md);
          background: var(--ala-blue-700);
          color: var(--ala-white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .ala-sidebar-title {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
        }

        .ala-sidebar-name {
          font-size: var(--ala-text-lg);
          font-weight: 700;
          color: var(--ala-white);
        }

        .ala-sidebar-subtitle {
          font-size: 0.6875rem;
          font-weight: 500;
          color: var(--ala-gray-500);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .ala-sidebar-nav {
          flex: 1;
          padding: var(--ala-space-3) var(--ala-space-3);
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .ala-nav-item {
          display: flex;
          align-items: center;
          gap: var(--ala-space-3);
          padding: 0.5625rem var(--ala-space-4);
          border-radius: var(--ala-radius-md);
          font-size: var(--ala-text-sm);
          font-weight: 500;
          color: var(--ala-gray-400);
          text-decoration: none;
          transition: all var(--ala-transition-fast);
          position: relative;
        }

        .ala-nav-item:hover {
          background: var(--ala-navy-800);
          color: var(--ala-white);
        }

        .ala-nav-item.active {
          background: var(--ala-navy-800);
          color: var(--ala-white);
          font-weight: 600;
        }

        .ala-nav-icon {
          width: 20px;
          text-align: center;
          font-size: 0.9375rem;
          flex-shrink: 0;
        }

        .ala-nav-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 50%;
          border-radius: 0 2px 2px 0;
        }

        .ala-sidebar-footer {
          padding: var(--ala-space-4) var(--ala-space-5);
          border-top: 1px solid var(--ala-navy-700);
          display: flex;
          align-items: center;
          gap: var(--ala-space-3);
        }

        .ala-sidebar-user {
          display: flex;
          align-items: center;
          gap: var(--ala-space-3);
          flex: 1;
          min-width: 0;
        }

        .ala-user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--ala-navy-700);
          color: var(--ala-gray-300);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--ala-text-sm);
          font-weight: 600;
          flex-shrink: 0;
        }

        .ala-user-info {
          min-width: 0;
        }

        .ala-user-name {
          font-size: var(--ala-text-sm);
          font-weight: 500;
          color: var(--ala-white);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ala-user-role {
          font-size: var(--ala-text-xs);
          font-weight: 500;
        }

        .ala-logout-btn {
          width: 34px;
          height: 34px;
          border-radius: var(--ala-radius-md);
          border: none;
          background: transparent;
          color: var(--ala-gray-500);
          font-size: var(--ala-text-base);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--ala-transition-fast);
          flex-shrink: 0;
        }

        .ala-logout-btn:hover {
          background: var(--ala-navy-800);
          color: var(--ala-danger-600);
        }

        .ala-main {
          flex: 1;
          margin-left: var(--ala-sidebar-width);
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 991.98px) {
          .ala-main {
            margin-left: 0;
          }
        }

        .ala-content {
          flex: 1;
          padding: var(--ala-space-8);
          max-width: var(--ala-content-max);
          width: 100%;
          margin: 0 auto;
        }
        @media (max-width: 767.98px) {
          .ala-content {
            padding: var(--ala-space-4);
            padding-top: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
