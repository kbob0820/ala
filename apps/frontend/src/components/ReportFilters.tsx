interface ReportFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  additionalFilters?: React.ReactNode;
  onRefresh: () => void;
  loading: boolean;
  onPrint?: () => void;
  onExport?: () => void;
}

export function ReportFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  additionalFilters,
  onRefresh,
  loading,
  onPrint,
  onExport,
}: ReportFiltersProps) {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label small mb-1">Date From</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1">Date To</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
          {additionalFilters && (
            <div className="col-md-3">{additionalFilters}</div>
          )}
          <div className="col-md-3">
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={onRefresh}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Refresh
                  </>
                ) : (
                  'Refresh'
                )}
              </button>
              {onPrint && (
                <button
                  className="btn btn-sm btn-outline-secondary d-print-none"
                  onClick={onPrint}
                >
                  Print
                </button>
              )}
              {onExport && (
                <button
                  className="btn btn-sm btn-outline-success d-print-none"
                  onClick={onExport}
                >
                  Export
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
