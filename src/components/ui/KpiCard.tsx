import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { InfoTip } from './Primitives';

export interface KpiDelta {
  /** Display text, e.g. "+12.4% vs Sep". */
  text: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether this direction is good for the business. */
  good: boolean | null;
}

/**
 * Compact KPI card: short label, one big value, one comparison line.
 * Supporting detail lives in the (i) tooltip so the card stays quiet.
 */
export function KpiCard({ label, value, delta, sub, onClick, tone, ariaLabel }: {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  /** Shown on demand in the (i) tooltip. */
  sub?: ReactNode;
  onClick?: () => void;
  tone?: 'crit' | 'warn';
  ariaLabel?: string;
}) {
  const Icon = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : ArrowRight;
  const deltaCls = delta?.good === true ? 'text-good' : delta?.good === false ? 'text-crit' : 'text-ink-3';
  return (
    <div className={`card group relative flex min-w-0 flex-col gap-2.5 overflow-hidden px-5 py-4 transition-shadow ${onClick ? 'hover:shadow-lift' : ''}`}>
      {onClick && <button onClick={onClick} aria-label={ariaLabel ?? `Open ${label}`} className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />}
      {tone && <span className={`absolute inset-y-0 left-0 w-1 ${tone === 'crit' ? 'bg-crit' : 'bg-warn'}`} aria-hidden />}
      <div className="pointer-events-none relative z-10 flex items-center gap-1.5">
        <span className="truncate text-[13px] font-medium text-ink-2">{label}</span>
        {sub && <span className="pointer-events-auto"><InfoTip text={sub} label={`About ${label}`} /></span>}
      </div>
      <div className="num pointer-events-none relative z-10 whitespace-nowrap font-display text-[28px] font-semibold leading-none tracking-tight text-ink">
        {typeof value === 'string' ? <MoneyValue v={value} /> : value}
      </div>
      {delta && (
        <div className={`pointer-events-none relative z-10 flex items-center gap-1 text-[12.5px] font-medium ${deltaCls}`}>
          <Icon size={14} aria-hidden />
          <span className="num truncate">{delta.text}</span>
        </div>
      )}
    </div>
  );
}

export function deltaPct(cur: number, prev: number | null | undefined, label: string, higherIsGood = true): KpiDelta | undefined {
  if (prev === null || prev === undefined) return undefined;
  if (prev === 0) return { text: cur === 0 ? `No change ${label}` : `New ${label}`, direction: cur > 0 ? 'up' : 'flat', good: cur === 0 ? null : higherIsGood };
  const d = (cur - prev) / Math.abs(prev);
  const dir = Math.abs(d) < 0.0005 ? 'flat' : d > 0 ? 'up' : 'down';
  return { text: `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d * 100).toFixed(0)}% ${label}`, direction: dir, good: dir === 'flat' ? null : (dir === 'up') === higherIsGood };
}

export function deltaAbs(cur: number, prev: number | null | undefined, label: string, higherIsGood: boolean, fmt: (n: number) => string = String): KpiDelta | undefined {
  if (prev === null || prev === undefined) return undefined;
  const d = cur - prev;
  const dir = d === 0 ? 'flat' : d > 0 ? 'up' : 'down';
  return { text: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${fmt(Math.abs(d))} ${label}`, direction: dir, good: dir === 'flat' ? null : (dir === 'up') === higherIsGood };
}

/** Target-of-zero comparison used by exception counts. */
export function deltaTarget(n: number): KpiDelta {
  return n ? { text: 'Target 0', direction: 'up', good: false } : { text: 'At target', direction: 'flat', good: null };
}

/** Renders "RM 7.18 million" with the currency and unit set smaller than the figure. */
function MoneyValue({ v }: { v: string }) {
  const m = v.match(/^(−?)RM ([\d.,]+)( million)?$/);
  if (!m) return <>{v}</>;
  return (
    <>
      <span className="mr-1 text-[15px] font-medium text-ink-2">{m[1]}RM</span>
      {m[2]}
      {m[3] && <span className="ml-1 text-[15px] font-medium text-ink-2">million</span>}
    </>
  );
}
