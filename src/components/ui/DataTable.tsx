import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from './Primitives';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => number | string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hidden below the lg breakpoint to keep tables readable on small screens. */
  secondary?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, initialSort, empty, maxHeight, caption, selectedKey, dense = false }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  onRowClick?: (r: T) => void;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  empty?: ReactNode;
  maxHeight?: string;
  caption: string;
  selectedKey?: string | null;
  dense?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    return [...rows].sort((a, b) => {
      const x = f(a), y = f(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? r : -r;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  if (!rows.length) return <>{empty ?? <EmptyState title="No records match" body="Try clearing a filter or widening the date range." />}</>;

  const py = dense ? 'py-2' : 'py-2.5';
  return (
    <div className="overflow-auto scroll-thin" style={{ maxHeight }}>
      <table className="w-full border-separate border-spacing-0 text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const align = c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left';
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`sticky top-0 z-10 whitespace-nowrap border-b border-line bg-sunken/95 px-3 py-2 text-[11.5px] font-semibold text-ink-2 backdrop-blur ${align} ${c.secondary ? 'hidden min-[1700px]:table-cell' : ''}`}>
                  {c.sort ? (
                    <button onClick={() => toggle(c.key)} className={`inline-flex items-center gap-1 hover:text-ink ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      {c.header}
                      {active ? (sort!.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />) : <ArrowUpDown size={12} className="opacity-40" aria-hidden />}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const k = rowKey(r);
            const sel = selectedKey === k;
            return (
              <tr key={k} onClick={onRowClick ? () => onRowClick(r) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(r); } } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={`${onRowClick ? 'cursor-pointer hover:bg-accent-soft/50 focus-visible:bg-accent-soft/60 focus-visible:outline-none' : ''} ${sel ? 'bg-accent-soft/70' : ''}`}>
                {columns.map((c) => (
                  <td key={c.key}
                    className={`border-b border-line/70 px-3 ${py} align-top ${c.align === 'right' ? 'num whitespace-nowrap text-right' : c.align === 'center' ? 'text-center' : ''} ${c.secondary ? 'hidden min-[1700px]:table-cell' : ''} ${c.className ?? ''}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
