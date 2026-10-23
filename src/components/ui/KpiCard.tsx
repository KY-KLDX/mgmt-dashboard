import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sparkline } from '../charts/Sparkline';

export interface KpiDelta {
  /** Display text, e.g. "+12.4% vs Sep 2026". */
  text: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether this direction is good for the business. */
  good: boolean | null;
}

export function KpiCard({ label, value, sub, delta, spark, onClick, tone, footnote, ariaLabel }: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: KpiDelta;
  spark?: number[];
  onClick?: () => void;
  tone?: 'crit' | 'warn';
  footnote?: ReactNode;
  ariaLabel?: string;
}) {
  const Icon = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : ArrowRight;
  const deltaCls = delta?.good === true ? 'text-good' : delta?.good === false ? 'text-crit' : 'text-ink-2';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} aria-label={ariaLabel}
      className={`card group relative flex min-w-0 flex-col gap-2 overflow-hidden p-4 text-left transition-shadow ${onClick ? 'cursor-pointer hover:shadow-lift focus-visible:shadow-lift' : ''}`}>
      {tone && <span className={`absolute inset-y-0 left-0 w-1 ${tone === 'crit' ? 'bg-crit' : 'bg-warn'}`} aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-medium leading-snug text-ink-2">{label}</span>
        {onClick && <ChevronRight size={15} className="mt-0.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="num whitespace-nowrap font-display text-[25px] font-semibold leading-none tracking-tight text-ink">{typeof value === 'string' ? <MoneyValue v={value} /> : value}</div>
        {spark && spark.length > 1 && <Sparkline values={spark} />}
      </div>
      {delta && (
        <div className={`flex items-center gap-1 text-[12px] font-medium ${deltaCls}`}>
          <Icon size={14} aria-hidden />
          <span className="num">{delta.text}</span>
        </div>
      )}
      {sub && <div className="text-[12px] leading-snug text-ink-3">{sub}</div>}
      {footnote}
    </Tag>
  );
}

export function deltaPct(cur: number, prev: number | null | undefined, label: string, higherIsGood = true): KpiDelta | undefined {
  if (prev === null || prev === undefined) return undefined;
  if (prev === 0) return { text: cur === 0 ? `No change ${label}` : `New ${label}`, direction: cur > 0 ? 'up' : 'flat', good: cur === 0 ? null : higherIsGood };
  const d = (cur - prev) / Math.abs(prev);
  const dir = Math.abs(d) < 0.0005 ? 'flat' : d > 0 ? 'up' : 'down';
  return { text: `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d * 100).toFixed(1)}% ${label}`, direction: dir, good: dir === 'flat' ? null : (dir === 'up') === higherIsGood };
}

export function deltaAbs(cur: number, prev: number | null | undefined, label: string, higherIsGood: boolean, fmt: (n: number) => string = String): KpiDelta | undefined {
  if (prev === null || prev === undefined) return undefined;
  const d = cur - prev;
  const dir = d === 0 ? 'flat' : d > 0 ? 'up' : 'down';
  return { text: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${fmt(Math.abs(d))} ${label}`, direction: dir, good: dir === 'flat' ? null : (dir === 'up') === higherIsGood };
}

/** Renders "RM 7.18 million" with the currency and unit set smaller than the figure. */
function MoneyValue({ v }: { v: string }) {
  const m = v.match(/^(−?)RM ([\d.,]+)( million)?$/);
  if (!m) return <>{v}</>;
  return (
    <>
      <span className="mr-1 text-[14px] font-medium text-ink-2">{m[1]}RM</span>
      {m[2]}
      {m[3] && <span className="ml-1 text-[14px] font-medium text-ink-2">million</span>}
    </>
  );
}
