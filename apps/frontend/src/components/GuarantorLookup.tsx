import { useState, useRef, useEffect, useCallback } from 'react';
import { getClients } from '@/services/clientService';
import type { ClientListItem } from '@/types';

export interface GuarantorLookupProps {
  onChange: (name: string) => void;
  excludeClientId?: number;
  preselectedName?: string;
}

export function GuarantorLookup({ onChange, excludeClientId, preselectedName }: GuarantorLookupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(preselectedName ?? null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback((value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getClients({ search: value, per_page: 8, status: 'active' });
        const active = data.data.filter(
          (c) => c.is_active !== false && c.id !== excludeClientId,
        );
        setResults(active);
        setIsOpen(true);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [excludeClientId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (client: ClientListItem) => {
    setSelectedName(client.name);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onChange(client.name);
  };

  const handleClear = () => {
    setSelectedName(null);
    setQuery('');
    onChange('');
  };

  return (
    <div ref={wrapperRef}>
      <label htmlFor="guarantor-lookup" className="form-label">
        Guarantor
      </label>
      <div className="position-relative">
        <div className="input-group">
          <span className="input-group-text">
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" />
            ) : (
              <i className="fa-solid fa-search" />
            )}
          </span>
          <input
            id="guarantor-lookup"
            type="text"
            className="form-control"
            value={selectedName ?? query}
            onChange={(e) => doSearch(e.target.value)}
            placeholder={selectedName ? '' : 'Search guarantor by name...'}
            autoComplete="off"
            readOnly={!!selectedName}
            style={selectedName ? { cursor: 'pointer' } : undefined}
            onClick={() => { if (selectedName) handleClear(); }}
          />
          {selectedName && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClear}
              aria-label="Clear guarantor selection"
            >
              <i className="fa-solid fa-times" />
            </button>
          )}
        </div>

        {isOpen && results.length > 0 && (
          <ul className="dropdown-menu show w-100" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {results.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => handleSelect(client)}
                >
                  <div className="fw-medium">{client.name}</div>
                  {client.contact_number && (
                    <small className="text-muted">{client.contact_number}</small>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {isOpen && results.length === 0 && query.trim() && !loading && (
          <ul className="dropdown-menu show w-100">
            <li><span className="dropdown-item text-muted">No borrowers found</span></li>
          </ul>
        )}
      </div>
    </div>
  );
}
