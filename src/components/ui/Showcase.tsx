import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sparkline } from '../charts/Sparkline';
import { MoneyValue, type KpiDelta } from './KpiCard';
import { InfoTip } from './Primitives';

/** Icon-tile colour sets for the headline cards. */
export const TILE = {
  blue: { tile: 'bg-info-soft text-info', line: 'rgb(var(--info))' },
  teal: { tile: 'bg-good-soft text-good', line: 'var(--series-2)' },
  violet: { tile: 'bg-violet-soft text-violet', line: 'rgb(var(--violet))' },
  red: { tile: 'bg-crit-soft text-crit', line: 'rgb(var(--crit))' },
} as const;
export type TileTone = keyof typeof TILE;

/** Small rising bars, the last bar emphasised. */
export function MiniBars({ values, color, width = 72, height = 40 }: { values: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...values, 1);
  const gap = 3;
  const w = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * height);
        return <rect key={i} x={i * (w + gap)} y={height - h} width={w} height={h} rx={1.5} fill={color} opacity={0.3 + (0.7 * (i + 1)) / values.length} />;
      })}
    </svg>
  );
}

/** Headline KPI card: tinted icon tile, label, big value, one comparison and a mini trend. */
export function HeroKpi({ icon: Icon, tone, label, value, delta, spark, bars, onClick, info }: {
  icon: LucideIcon; tone: TileTone; label: string; value: string; delta?: KpiDelta; spark?: number[]; bars?: number[]; onClick?: () => void; info: string;
}) {
  const D = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : ArrowRight;
  const dcls = delta?.good === true ? 'text-good' : delta?.good === false ? 'text-crit' : 'text-ink-3';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} title={info} aria-label={`${label}: ${value}. ${info}`}
      className={`card flex min-w-0 items-center gap-4 px-5 py-5 text-left transition-shadow ${onClick ? 'hover:shadow-lift' : ''}`}>
      <span className={`grid h-14 w-14 shrink-0 place-items-center self-start rounded-2xl ${TILE[tone].tile}`}><Icon size={26} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="num mt-1 block whitespace-nowrap font-display text-[30px] font-semibold leading-tight tracking-tight"><MoneyValue v={value} /></span>
        {delta && <span className={`mt-1 flex items-center gap-1 whitespace-nowrap text-[13.5px] font-semibold ${dcls}`}><D size={16} aria-hidden />{delta.text}</span>}
      </span>
      {spark && <span className="hidden self-end sm:block"><Sparkline values={spark} width={84} height={48} color={TILE[tone].line} /></span>}
      {bars && <span className="hidden self-end sm:block"><MiniBars values={bars} color={TILE[tone].line} /></span>}
    </Tag>
  );
}

/** Card with a serif title, a leading icon, optional (i) note and header actions. */
export function Panel({ icon: Icon, title, children, iconTile, info, actions }: {
  icon: LucideIcon; title: string; children: ReactNode; iconTile?: TileTone; info?: string; actions?: ReactNode;
}) {
  return (
    <section className="card flex h-full min-w-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 px-6 pb-3 pt-5">
        {iconTile
          ? <span className={`grid h-10 w-10 place-items-center rounded-xl ${TILE[iconTile].tile}`}><Icon size={20} aria-hidden /></span>
          : <Icon size={24} className="text-ink" aria-hidden />}
        <h2 className="font-display text-[21px] font-semibold tracking-tight">{title}</h2>
        {info && <InfoTip text={info} label={`About ${title}`} wide />}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
