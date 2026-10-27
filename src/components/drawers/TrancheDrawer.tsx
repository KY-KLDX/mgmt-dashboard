import { CheckCircle2, Circle } from 'lucide-react';
import { AS_OF, daysFromAsOf } from '../../data/asOf';
import { INVESTORS, SUBSCRIPTIONS } from '../../data/investors';
import { OBLIGATIONS } from '../../data/obligations';
import { date, pct, relDays, rm } from '../../lib/format';
import { investorLabel } from '../../lib/identity';
import { issuerShort, trancheById, trancheStats } from '../../lib/selectors/finance';
import { useApp } from '../../state/AppState';
import { StatusBadge, toneFor } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { Drawer, DrawerSection, NeedsLine } from '../ui/Drawer';
import { Field, InfoTip, Progress } from '../ui/Primitives';

export function TrancheDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { thresholds, role, openDrawer } = useApp();
  const t = trancheById(id);
  if (!t) return null;
  const s = trancheStats(t, thresholds);
  const holders = SUBSCRIPTIONS.filter((x) => x.trancheId === t.id && (x.status === 'Allocated' || x.status === 'Pending')).sort((a, b) => b.amount - a.amount);
  const base = s.indicative ? s.pending : s.successful;
  const top3 = holders.slice(0, 3).reduce((a, x) => a + x.amount, 0);
  const obligations = OBLIGATIONS.filter((o) => o.trancheId === t.id);
  const openException = t.exceptions.find((e) => !e.resolved);
  const steps = [
    { label: 'Opens', d: t.openDate },
    { label: 'Closes and allocates', d: t.closeDate },
    { label: 'Issuance', d: t.issueDate },
    { label: 'Matures', d: t.maturityDate },
  ];
  const invById = new Map(INVESTORS.map((i) => [i.id, i]));
  const riskTone = s.risk === 'Critical' ? 'crit' : 'warn';

  return (
    <Drawer open onClose={onClose} title={t.name} eyebrow={t.id}
      headerExtra={<><StatusBadge status={t.stage} />{(s.risk === 'Critical' || s.risk === 'Attention') && <StatusBadge status={s.risk} tone={toneFor(s.risk === 'Attention' ? 'attention' : s.risk)} />}</>}>
      {(s.riskReason || openException) && <NeedsLine label="Issue" text={s.riskReason ?? openException!.text} tone={riskTone} />}

      <DrawerSection title="Key facts">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="num font-display text-[24px] font-semibold">{rm(base)}</span>
          <span className="num text-[13px] text-ink-2">{pct(s.fulfilment, 0)} of {rm(t.target)}{s.indicative && ' (pending)'}</span>
        </div>
        <Progress value={s.fulfilment} tone={s.risk === 'Critical' ? 'crit' : s.risk === 'Attention' ? 'warn' : 'accent'} label="Fulfilment" />
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Issuer"><button className="text-left font-medium text-accent-ink hover:underline" onClick={() => openDrawer({ kind: 'issuer', id: t.issuerId })}>{issuerShort(t.issuerId)}</button></Field>
          <Field label={s.daysToClose >= 0 ? 'Closes' : 'Closed'}><span className="num">{date(t.closeDate)}</span></Field>
          <Field label="Fee rate"><span className="num">{pct(t.feeRate, 2)}</span></Field>
          <Field label={<span className="inline-flex items-center gap-1">Revenue <InfoTip text={s.indicative ? 'Not recognised until requests are allocated at close.' : 'Successful amount × fee rate. Rejected and cancelled requests excluded. No tranche-level profit is calculated.'} /></span>}>
            <span className="num font-semibold">{rm(s.revenue)}</span>
            <span className="num block text-[11.5px] text-ink-3">{rm(s.successful)} × {pct(t.feeRate, 2)}</span>
          </Field>
        </dl>
      </DrawerSection>

      <DrawerSection folded title="Requests">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Gross"><span className="num">{rm(s.gross)}</span></Field>
          <Field label={s.indicative ? 'Pending' : 'Allocated'}><span className="num">{rm(base)}</span></Field>
          <Field label="Rejected"><span className="num">{rm(s.rejected)}</span></Field>
          <Field label="Cancelled"><span className="num">{rm(s.cancelled)}</span></Field>
        </dl>
      </DrawerSection>

      <DrawerSection folded title="Timeline">
        <ol className="space-y-2.5">
          {steps.map((st) => {
            const done = st.d <= AS_OF && !(st.label === 'Issuance' && t.stage === 'Closed');
            return (
              <li key={st.label} className="flex items-center gap-3 text-[13px]">
                {done ? <CheckCircle2 size={16} className="text-good" aria-hidden /> : <Circle size={16} className="text-ink-3" aria-hidden />}
                <span className="flex-1">{st.label}</span>
                <span className="num text-ink-2">{date(st.d)}</span>
                <span className="num w-24 text-right text-[12px] text-ink-3">{done ? 'Done' : relDays(daysFromAsOf(st.d), 'ago')}</span>
              </li>
            );
          })}
        </ol>
      </DrawerSection>

      {holders.length > 0 && (
        <DrawerSection folded title={`Investors (${holders.length}) · top 3 hold ${pct(base ? top3 / base : 0, 0)}`}>
          <DataTable caption="Investors in tranche" dense maxHeight="260px" rows={holders} rowKey={(r) => r.id}
            onRowClick={(r) => openDrawer({ kind: 'investor', id: r.investorId })}
            columns={[
              { key: 'inv', header: 'Investor', render: (r) => investorLabel(invById.get(r.investorId)!, role), sort: (r) => investorLabel(invById.get(r.investorId)!, role) },
              { key: 'amt', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
              { key: 'share', header: 'Share', align: 'right', render: (r) => pct(base ? r.amount / base : 0), sort: (r) => r.amount },
            ]} initialSort={{ key: 'amt', dir: 'desc' }} />
        </DrawerSection>
      )}

      {obligations.length > 0 && (
        <DrawerSection folded title={`Obligations (${obligations.length})`}>
          <ul className="space-y-2">
            {obligations.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span>{o.title}<span className="num block text-[12px] text-ink-3">{date(o.dueDate)}</span></span>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </DrawerSection>
      )}

      {(t.notes.length > 0 || t.exceptions.length > 0) && (
        <DrawerSection folded title="Notes and exceptions">
          <ul className="space-y-2 text-[13px]">
            {t.notes.map((n) => <li key={n}>{n}</li>)}
            {t.exceptions.map((e) => (
              <li key={e.text} className="flex items-start justify-between gap-3">
                <span><span className="num text-[12px] text-ink-3">{date(e.date)}</span><br />{e.text}</span>
                <StatusBadge status={e.resolved ? 'Resolved' : 'Open'} tone={e.resolved ? 'good' : 'warn'} />
              </li>
            ))}
          </ul>
        </DrawerSection>
      )}
    </Drawer>
  );
}
