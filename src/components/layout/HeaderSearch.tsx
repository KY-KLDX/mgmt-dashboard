import { Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { search } from '../../lib/selectors/search';
import { useApp } from '../../state/AppState';

/**
 * Global search typed directly in the header. Results drop down under the field;
 * there is no separate search window. Ctrl/⌘K focuses the field.
 */
export function HeaderSearch() {
  const { governance, navigate } = useApp();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();
  const results = useMemo(() => search(q, governance).slice(0, 8), [q, governance]);
  const show = open && q.trim().length >= 2;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, []);

  useEffect(() => setActive(0), [q]);

  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    navigate(r.link);
    setQ('');
    setOpen(false);
    input.current?.blur();
  };

  let lastGroup = '';
  return (
    <div ref={wrap} className="relative w-full md:w-72 md:transition-[width] md:duration-200 md:focus-within:w-[420px]">
      <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
      <input ref={input} type="text" role="combobox" aria-expanded={show} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={show && results[active] ? `${listId}-${active}` : undefined}
        aria-label="Search tranches, issuers, investors, incidents and policies" placeholder="Search…" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
          else if (e.key === 'Escape') { setQ(''); setOpen(false); }
        }}
        className="h-10 w-full rounded-xl border border-line bg-canvas pl-10 pr-16 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20" />
      {q ? (
        <button onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:bg-sunken hover:text-ink"><X size={15} aria-hidden /></button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-3 sm:block">Ctrl K</kbd>
      )}

      {show && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lift animate-rise">
          {results.length ? (
            <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto scroll-thin py-1.5">
              {results.map((r, i) => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                return (
                  <li key={`${r.group}-${r.key}`} role="presentation">
                    {header && <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{header}</div>}
                    <div id={`${listId}-${i}`} role="option" aria-selected={i === active}
                      onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); choose(i); }}
                      className={`mx-1.5 cursor-pointer rounded-lg px-2.5 py-2 ${i === active ? 'bg-accent-soft' : ''}`}>
                      <div className="truncate text-[13.5px] font-medium">{r.title}</div>
                      <div className="truncate text-[12px] text-ink-3">{r.sub}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p id={listId} role="status" className="px-4 py-3 text-[13px] text-ink-3">No matches for “{q.trim()}”</p>
          )}
        </div>
      )}
    </div>
  );
}
