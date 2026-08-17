import { useState, useRef, useEffect, useCallback } from 'react';
import { getClients } from '@/services/clientService';
import type { ClientListItem } from '@/types';

export interface BorrowerLookupProps {
  onChange: (id: number | null) => void;
  preselectedClient?: { id: number; name: string } | null;
}

export function BorrowerLookup({ onChange, preselectedClient }: BorrowerLookupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(
    preselectedClient ?? null,
  );

  useEffect(() => {
    if (preselectedClient) {
      setSelectedClient(preselectedClient);
      onChange(preselectedClient.id);
    }
  }, []);
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
        const active = data.data.filter((c) => c.is_active !== false);
        setResults(active);
        setIsOpen(true);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

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
    setSelectedClient({ id: client.id, name: client.name });
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onChange(client.id);
  };

  const handleClear = () => {
    if (preselectedClient) return;
    setSelectedClient(null);
    setQuery('');
    onChange(null);
  };

  return (
    <div className="mb-3" ref={wrapperRef}>
      <label htmlFor="borrower-lookup" className="form-label">
        Borrower
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
            id="borrower-lookup"
            type="text"
            className="form-control"
            value={selectedClient ? selectedClient.name : query}
            onChange={(e) => doSearch(e.target.value)}
            placeholder={selectedClient ? '' : 'Search borrower by name...'}
            autoComplete="off"
            readOnly={!!selectedClient}
            style={selectedClient ? { cursor: 'pointer' } : undefined}
            onClick={() => { if (selectedClient) handleClear(); }}
          />
          {selectedClient && !preselectedClient && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClear}
              aria-label="Clear borrower selection"
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
