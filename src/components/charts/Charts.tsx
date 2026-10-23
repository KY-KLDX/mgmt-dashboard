import type { ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { monthLabel, monthLong, rm, rmAxis } from '../../lib/format';

export const SERIES = {
  s1: 'var(--series-1)',
  s2: 'var(--series-2)',
  s3: 'var(--series-3)',
  muted: 'var(--series-muted)',
};

interface TipRow { label: string; value: string; color?: string; dashed?: boolean }

export function TipBox({ title, rows, note }: { title: ReactNode; rows: TipRow[]; note?: ReactNode }) {
  return (
    <div className="min-w-[200px] rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-lift">
      <div className="mb-1 font-semibold text-ink">{title}</div>
      <table className="w-full">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-0.5 pr-3 text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  {r.color && <span className="inline-block h-0.5 w-3 rounded" style={{ background: r.color, opacity: r.dashed ? 0.7 : 1 }} aria-hidden />}
                  {r.label}
                </span>
              </td>
              <td className="num py-0.5 text-right font-medium text-ink">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <div className="mt-1 text-[11px] text-ink-3">{note}</div>}
    </div>
  );
}

const axisProps = { tickLine: false, axisLine: false, tick: { fontSize: 11 } } as const;

function LegendRow({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden><line x1="1" y1="4" x2="17" y2="4" stroke={i.color} strokeWidth="2" strokeDasharray={i.dashed ? '4 3' : undefined} strokeLinecap="round" /></svg>
          {i.label}
        </span>
      ))}
    </div>
  );
}

export interface TrendPoint {
  month: string;
  subs: number;
  revenue: number;
  budgetSubs: number | null;
  budgetRevenue: number | null;
  opex: number | null;
  ebitda: number | null;
  netResult: number | null;
  partial: boolean;
}

/** Successful subscriptions per month vs budget (tranche-derived). */
export function SubscriptionTrend({ data, height = 220, onMonth, selected }: { data: TrendPoint[]; height?: number; onMonth?: (m: string) => void; selected?: string }) {
  return (
    <div className="space-y-2">
      <LegendRow items={[{ label: 'Successful subscriptions', color: SERIES.s1 }, { label: 'Budget', color: SERIES.muted, dashed: true }]} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
            onClick={(e) => { const p = (e as { activeLabel?: string } | null)?.activeLabel; if (p && onMonth) onMonth(p); }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} {...axisProps} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tickFormatter={rmAxis} {...axisProps} width={78} />
            <Tooltip cursor={{ stroke: 'var(--axis)', strokeDasharray: '3 3' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as TrendPoint;
              return <TipBox title={`${monthLong(p.month)}${p.partial ? ' (to date)' : ''}`}
                rows={[{ label: 'Successful subscriptions', value: rm(p.subs), color: SERIES.s1 }, { label: 'Budget', value: p.budgetSubs ? rm(p.budgetSubs) : '—', color: SERIES.muted, dashed: true }]}
                note={onMonth ? 'Click to filter tranches closed this month' : undefined} />;
            }} />
            {selected && <ReferenceLine x={selected} stroke="var(--series-1)" strokeOpacity={0.35} strokeWidth={10} />}
            <Line type="monotone" dataKey="budgetSubs" stroke={SERIES.muted} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="subs" stroke={SERIES.s1} strokeWidth={2} dot={{ r: 3.5, strokeWidth: 0, fill: SERIES.s1 }}
              activeDot={{ r: 5.5, stroke: 'rgb(var(--surface))', strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Revenue (tranche-derived) against company operating expenses and EBITDA (month-end P&L). */
export function PnlTrend({ data, height = 220, metric = 'ebitda' }: { data: TrendPoint[]; height?: number; metric?: 'ebitda' | 'netResult' }) {
  const label = metric === 'ebitda' ? 'EBITDA' : 'Net result';
  return (
    <div className="space-y-2">
      <LegendRow items={[
        { label: 'Recognised revenue (tranche-derived)', color: SERIES.s2 },
        { label: 'Operating expenses (company P&L)', color: SERIES.s3 },
        { label: `${label} (company P&L)`, color: SERIES.s1 },
      ]} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} {...axisProps} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tickFormatter={rmAxis} {...axisProps} width={78} />
            <ReferenceLine y={0} stroke="var(--axis)" strokeOpacity={0.6} />
            <Tooltip cursor={{ stroke: 'var(--axis)', strokeDasharray: '3 3' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as TrendPoint;
              const m = p[metric];
              return <TipBox title={`${monthLong(p.month)}${p.partial ? ' (to date)' : ''}`}
                rows={[
                  { label: 'Recognised revenue', value: rm(p.revenue), color: SERIES.s2 },
                  { label: 'Operating expenses', value: p.opex === null ? 'Not yet closed' : rm(p.opex), color: SERIES.s3 },
                  { label, value: m === null ? 'Not yet closed' : rm(m), color: SERIES.s1 },
                ]}
                note={p.opex === null ? 'Month-end P&L not yet closed.' : undefined} />;
            }} />
            <Line type="monotone" dataKey="revenue" stroke={SERIES.s2} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: SERIES.s2 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="opex" stroke={SERIES.s3} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: SERIES.s3 }} isAnimationActive={false} connectNulls={false} />
            <Line type="monotone" dataKey={metric} stroke={SERIES.s1} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: SERIES.s1 }} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export interface HBarDatum { key: string; label: string; value: number; display: string; sub?: string; highlight?: boolean }

/** Horizontal comparison bars. Clicking a bar calls onSelect. */
export function HBars({ data, onSelect, selected, height, color = SERIES.s1, valueLabel, labelWidth = 120 }: {
  data: HBarDatum[]; onSelect?: (key: string) => void; selected?: string | null; height?: number; color?: string; valueLabel: string; labelWidth?: number;
}) {
  const h = height ?? data.length * 40 + 16;
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, left: 4, bottom: 4 }} barCategoryGap={10}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={labelWidth} {...axisProps} tick={{ fontSize: 11.5 }} />
          <Tooltip cursor={{ fill: 'rgb(var(--sunken))' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as HBarDatum;
            return <TipBox title={d.label} rows={[{ label: valueLabel, value: d.display }]} note={d.sub ?? (onSelect ? 'Click to filter' : undefined)} />;
          }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} onClick={(d) => onSelect?.((d as unknown as HBarDatum).key)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            {data.map((d) => (
              <Cell key={d.key} fill={color} fillOpacity={selected && selected !== d.key ? 0.3 : 1} />
            ))}
            <LabelList dataKey="display" content={(p) => {
              const { x = 0, y = 0, width = 0, height: hh = 0, value } = p as { x?: number; y?: number; width?: number; height?: number; value?: string };
              return <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(hh) / 2} dominantBaseline="central" fontSize={11.5} fill="rgb(var(--ink-2))">{value}</text>;
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
