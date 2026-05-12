'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  id: number;
  label: string;
  secondary?: string;
}

const PANEL =
  'absolute z-[60] left-0 right-0 mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden';

export function SearchableSelect({
  options,
  value,
  onChange,
  disabled,
  placeholder = 'Buscar…',
  emptyMessage = 'Nenhum resultado',
  noOptionsMessage = 'Nenhuma opção disponível',
}: {
  options: SearchableSelectOption[];
  value: number;
  onChange: (id: number) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  noOptionsMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.secondary ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = useCallback(
    (id: number) => {
      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight].id);
    }
  };

  const triggerLabel = selected?.label ?? (options.length === 0 ? noOptionsMessage : 'Selecione…');

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => {
          if (disabled || options.length === 0) return;
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-left text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="flex-1 min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={PANEL} onKeyDown={onKeyDown}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              autoComplete="off"
            />
          </div>
          <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{options.length === 0 ? noOptionsMessage : emptyMessage}</li>
            ) : (
              filtered.map((o, i) => (
                <li key={o.id} role="option" aria-selected={o.id === value}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(o.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      i === highlight ? 'bg-slate-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/80'
                    } ${o.id === value ? 'font-semibold text-slate-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}
                  >
                    <span className="block truncate">{o.label}</span>
                    {o.secondary && <span className="block truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5">{o.secondary}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
