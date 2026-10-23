import { ArrowRight, Calculator, CheckCircle2, Circle } from 'lucide-react';
import { AS_OF, daysFromAsOf } from '../../data/asOf';
import { INVESTORS, SUBSCRIPTIONS } from '../../data/investors';
import { OBLIGATIONS } from '../../data/obligations';
import { date, pct, relDays, rm, rmShort } from '../../lib/format';
import { investorLabel } from '../../lib/identity';
import { trancheById, trancheStats } from '../../lib/selectors/finance';
import { useApp } from '../../state/AppState';
import { StatusBadge, toneFor } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { Drawer, DrawerSection } from '../ui/Drawer';
import { EmptyState, Field, Progress } from '../ui/Primitives';

export function TrancheDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { thresholds, role, openDrawer } = useApp();
  const t = trancheById(id);
  if (!t) return null;
  const s = trancheStats(t, thresholds);
  const subs = SUBSCRIPTIONS.filter((x) => x.trancheId === t.id);
  const holders = subs.filter((x) => x.status === 'Allocated' || x.status === 'Pending').sort((a, b) => b.amount - a.amount);
  const base = s.indicative ? s.pending : s.successful;
  const top3 = holders.slice(0, 3).reduce((a, x) => a + x.amount, 0);
  const obligations = OBLIGATIONS.filter((o) => o.trancheId === t.id);
  const steps = [
    { label: 'Opening', d: t.openDate },
    { label: 'Closing and allocation', d: t.closeDate },
    { label: t.stage === 'Closed' ? 'Issuance (scheduled)' : 'Issuance and settlement', d: t.issueDate },
    { label: 'Maturity and principal repayment', d: t.maturityDate },
  ];
  const invById = new Map(INVESTORS.map((i) => [i.id, i]));

  return (
    <Drawer open onClose={onClose} title={t.name} eyebrow={`Tranche · ${t.id}`} width="max-w-[720px]"
      headerExtra={<><StatusBadge status={t.stage} /><StatusBadge status={s.risk} tone={toneFor(s.risk === 'Attention' ? 'attention' : s.risk)} />{s.riskReason && <span className="text-[12px] text-ink-3">{s.riskReason}</span>}</>}>
      <DrawerSection title="Summary">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Issuer"><button className="text-left font-medium text-accent-ink hover:underline" onClick={() => openDrawer({ kind: 'issuer', id: t.issuerId })}>{s.issuer}</button></Field>
          <Field label="Instrument">{t.instrument}, {t.tenorMonths} months</Field>
          <Field label="Indicative profit rate">{pct(t.profitRate, 2)} p.a.</Field>
          <Field label="Target amount"><span className="num">{rm(t.target)}</span></Field>
          <Field label="Subscribers"><span className="num">{s.subscribers}</span></Field>
          <Field label="Applicable KLDX fee rate"><span className="num">{pct(t.feeRate, 2)}</span></Field>
        </dl>
      </DrawerSection>

      <DrawerSection title={s.indicative ? 'Target vs subscription requests (indicative)' : 'Target vs successful subscription'}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="num font-display text-[22px] font-semibold">{rm(base)}</span>
          <span className="num text-[13px] text-ink-2">{pct(s.fulfilment)} of {rm(t.target)}</span>
        </div>
        <Progress value={s.fulfilment} tone={s.risk === 'Critical' ? 'crit' : s.risk === 'Attention' ? 'warn' : 'accent'} label="Fulfilment" />
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
          <Field label="Gross requests"><span className="num">{rm(s.gross)}</span></Field>
          <Field label={s.indicative ? 'Pending (not yet allocated)' : 'Allocated'}><span className="num">{rm(s.indicative ? s.pending : s.successful)}</span></Field>
          <Field label="Rejected"><span className="num">{rm(s.rejected)}</span></Field>
          <Field label="Cancelled"><span className="num">{rm(s.cancelled)}</span></Field>
        </dl>
      </DrawerSection>

      <DrawerSection title="Recognised revenue calculation" aside={<Calculator size={15} className="text-ink-3" aria-hidden />}>
        <div className="rounded-lg bg-sunken p-3 font-mono text-[12.5px] leading-relaxed">
          <div className="text-ink-3">Recognised revenue = Successful subscription amount × Applicable KLDX fee rate</div>
          <div className="num mt-1 text-ink">= {rm(s.successful)} × {pct(t.feeRate, 2)} = <span className="font-semibold">{rm(s.revenue)}</span></div>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">
          {s.indicative
            ? `No revenue is recognised yet. ${rm(s.pending)} of requests are pending and will count only once allocated at close on ${date(t.closeDate)}.`
            : `Excludes ${rm(s.rejected + s.cancelled)} of rejected or cancelled requests. Operating costs are not allocated to tranches, so no tranche-level profit is shown.`}
        </p>
      </DrawerSection>

      <DrawerSection title="Timeline">
        <ol className="space-y-2.5">
          {steps.map((st) => {
            const done = st.d <= AS_OF && !(st.label.startsWith('Issuance') && t.stage === 'Closed');
            return (
              <li key={st.label} className="flex items-center gap-3 text-[13px]">
                {done ? <CheckCircle2 size={16} className="text-good" aria-hidden /> : <Circle size={16} className="text-ink-3" aria-hidden />}
                <span className="flex-1">{st.label}</span>
                <span className="num text-ink-2">{date(st.d)}</span>
                <span className="num w-28 text-right text-[12px] text-ink-3">{done ? 'Done' : relDays(daysFromAsOf(st.d), 'ago')}</span>
              </li>
            );
          })}
        </ol>
      </DrawerSection>

      <DrawerSection title={`${s.indicative ? 'Investors with pending requests' : t.stage === 'Matured' ? 'Investors at maturity' : 'Current active investors'} (${holders.length})`}>
        {holders.length ? (
          <>
            <p className="mb-2 text-[12.5px] text-ink-2">
              Concentration: top 3 investors hold <span className="num font-semibold">{pct(base ? top3 / base : 0)}</span> of this tranche; largest single holding {pct(base ? holders[0].amount / base : 0)}.
            </p>
            <DataTable caption="Investors in tranche" dense maxHeight="260px" rows={holders} rowKey={(r) => r.id}
              onRowClick={(r) => openDrawer({ kind: 'investor', id: r.investorId })}
              columns={[
                { key: 'inv', header: 'Investor', render: (r) => investorLabel(invById.get(r.investorId)!, role), sort: (r) => investorLabel(invById.get(r.investorId)!, role) },
                { key: 'amt', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
                { key: 'share', header: 'Share', align: 'right', render: (r) => pct(base ? r.amount / base : 0), sort: (r) => r.amount },
                { key: 'st', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              ]} initialSort={{ key: 'amt', dir: 'desc' }} />
          </>
        ) : <EmptyState title="No subscriptions yet" body={`Tranche opens ${date(t.openDate)}.`} />}
      </DrawerSection>

      <DrawerSection title="Related issuer obligations">
        {obligations.length ? (
          <ul className="space-y-2">
            {obligations.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3 rounded-lg border border-line p-2.5 text-[13px]">
                <div>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-[12px] text-ink-3">{o.type} · {o.owner} · due {date(o.dueDate)}</div>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        ) : <p className="text-[13px] text-ink-3">No open obligations linked to this tranche.</p>}
      </DrawerSection>

      <DrawerSection title="Operational notes and exception history">
        {t.notes.length === 0 && t.exceptions.length === 0 && <p className="text-[13px] text-ink-3">No notes or exceptions recorded.</p>}
        <ul className="space-y-2 text-[13px]">
          {t.notes.map((n) => <li key={n} className="flex gap-2"><ArrowRight size={14} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />{n}</li>)}
          {t.exceptions.map((e) => (
            <li key={e.text} className="flex items-start justify-between gap-3 rounded-lg bg-sunken p-2.5">
              <span><span className="num text-[12px] text-ink-3">{date(e.date)}</span><br />{e.text}</span>
              <StatusBadge status={e.resolved ? 'Resolved' : 'Open exception'} tone={e.resolved ? 'good' : 'warn'} />
            </li>
          ))}
        </ul>
      </DrawerSection>
      <p className="text-center text-[11.5px] text-ink-3">Synthetic demonstration data · Successful amount {rmShort(s.successful)}</p>
    </Drawer>
  );
}
