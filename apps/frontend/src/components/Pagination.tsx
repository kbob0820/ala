interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, lastPage, onPageChange }: PaginationProps) {
  if (lastPage <= 1) return null;

  const pages: (number | string)[] = [];
  const delta = 2;

  for (let i = 1; i <= lastPage; i++) {
    if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="ala-pagination">
      <button
        className="ala-page-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.625rem' }} />
        <span className="d-none d-sm-inline">Prev</span>
      </button>
      {pages.map((p, i) =>
        typeof p === 'number' ? (
          <button
            key={i}
            className={`ala-page-btn ${p === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ) : (
          <span key={i} className="ala-page-ellipsis">...</span>
        ),
      )}
      <button
        className="ala-page-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === lastPage}
      >
        <span className="d-none d-sm-inline">Next</span>
        <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.625rem' }} />
      </button>

      <style>{`
        .ala-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--ala-space-1);
          padding-top: var(--ala-space-6);
        }
        .ala-page-btn {
          min-width: 34px;
          height: 34px;
          padding: 0 var(--ala-space-2);
          border: 1px solid var(--ala-gray-300);
          border-radius: var(--ala-radius-md);
          background: var(--ala-white);
          color: var(--ala-gray-700);
          font-size: var(--ala-text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--ala-transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--ala-space-1);
        }
        .ala-page-btn:hover:not(:disabled):not(.active) {
          background: var(--ala-gray-100);
          border-color: var(--ala-gray-400);
        }
        .ala-page-btn.active {
          background: var(--ala-blue-700);
          border-color: var(--ala-blue-700);
          color: var(--ala-white);
          font-weight: 600;
        }
        .ala-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .ala-page-ellipsis {
          width: 34px;
          text-align: center;
          color: var(--ala-gray-400);
          font-size: var(--ala-text-sm);
        }
      `}</style>
    </div>
  );
}
