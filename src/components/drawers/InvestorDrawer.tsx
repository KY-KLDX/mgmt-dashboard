import { CheckCircle2, Circle, EyeOff, XCircle } from 'lucide-react';
import { INVESTORS } from '../../data/investors';
import { TRANCHES } from '../../data/tranches';
import { date, rm } from '../../lib/format';
import { investorLabel } from '../../lib/identity';
import { investorMetrics, isCurrentAt } from '../../lib/selectors/investors';
import { useApp } from '../../state/AppState';
import { StatusBadge } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { Drawer, DrawerSection } from '../ui/Drawer';
import { Field } from '../ui/Primitives';
import { AS_OF } from '../../data/asOf';

export function InvestorDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { role, openDrawer } = useApp();
  const inv = INVESTORS.find((i) => i.id === id);
  if (!inv) return null;
  const m = investorMetrics(inv);
  const tr = new Map(TRANCHES.map((t) => [t.id, t]));
  const current = m.subs.filter((s) => isCurrentAt(s, AS_OF));
  const stages: [string, string | null, boolean][] = [
    ['Registered', inv.registeredOn, true],
    ['Onboarding started', inv.onboardingStartedOn, !!inv.onboardingStartedOn],
    ['CTOS completed', inv.ctosCompletedOn, inv.ctos === 'Completed'],
    ['KYC completed', inv.kycCompletedOn, inv.kyc === 'Completed'],
    ['Account approved', inv.approvedOn, !!inv.approvedOn],
  ];
  return (
    <Drawer open onClose={onClose} title={investorLabel(inv, role)} eyebrow={role === 'CEO' ? `Investor record · ${inv.id}` : 'Investor record · anonymised'} width="max-w-[700px]"
      headerExtra={<>
        <StatusBadge status={inv.accountStatus} />
        <StatusBadge status={m.currentCount > 0 ? 'Current active investor' : 'No current subscription'} tone={m.currentCount > 0 ? 'good' : 'mute'} />
        {role === 'Management' && <span className="inline-flex items-center gap-1 text-[12px] text-ink-3"><EyeOff size={13} aria-hidden /> Identity hidden in Management View</span>}
      </>}>
      <DrawerSection title="Position">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Current subscriptions"><span className="num font-semibold">{rm(m.current)}</span> <span className="text-ink-3">({m.currentCount})</span></Field>
          <Field label="Lifetime allocated funds"><span className="num">{rm(m.lifetimeAllocated)}</span></Field>
          <Field label="Total successful deposits"><span className="num">{rm(m.deposits)}</span></Field>
          <Field label="Completed withdrawals"><span className="num">{rm(m.withdrawals)}</span> <span className="text-ink-3">({m.withdrawalCount})</span></Field>
          <Field label="Failed top-ups"><span className={`num ${m.failedTopUps ? 'text-crit' : ''}`}>{m.failedTopUps} · {rm(m.failedTopUpAmount)}</span></Field>
          <Field label="Wallet balance"><span className="num">{rm(m.wallet)}</span></Field>
          <Field label="Pending requests"><span className="num">{rm(m.pending)}</span></Field>
          <Field label="Investor type">{inv.type}</Field>
          <Field label="Last activity">{date(inv.lastActivity)}</Field>
        </dl>
      </DrawerSection>

      <DrawerSection title="Onboarding status">
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {stages.map(([label, d, done]) => (
            <li key={label} className={`rounded-lg border p-2.5 text-[12.5px] ${done ? 'border-good/30 bg-good-soft/40' : 'border-line bg-sunken/60'}`}>
              <div className="flex items-center gap-1.5 font-medium">
                {done ? <CheckCircle2 size={14} className="text-good" aria-hidden /> : d === null && label !== 'Registered' ? <Circle size={14} className="text-ink-3" aria-hidden /> : <XCircle size={14} className="text-warn" aria-hidden />}
                {label}
              </div>
              <div className="num mt-0.5 text-ink-3">{done ? date(d) : label.startsWith('CTOS') ? inv.ctos : label.startsWith('KYC') ? inv.kyc : 'Not yet'}</div>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11.5px] text-ink-3">Identity numbers, addresses, bank details, identity documents and CTOS report content are deliberately not shown.</p>
      </DrawerSection>

      {inv.issues.length > 0 && (
        <DrawerSection title="Operational issues">
          <ul className="space-y-1.5 text-[13px]">{inv.issues.map((x) => <li key={x} className="rounded-lg bg-warn-soft px-3 py-2">{x}</li>)}</ul>
        </DrawerSection>
      )}

      <DrawerSection title={`Current subscriptions (${current.length})`}>
        <DataTable caption="Current subscriptions" dense rows={current} rowKey={(r) => r.id} onRowClick={(r) => openDrawer({ kind: 'tranche', id: r.trancheId })}
          empty={<p className="text-[13px] text-ink-3">No current subscriptions. This investor is not counted as active.</p>}
          columns={[
            { key: 't', header: 'Tranche', render: (r) => tr.get(r.trancheId)!.name },
            { key: 'a', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
            { key: 'm', header: 'Matures', render: (r) => date(tr.get(r.trancheId)!.maturityDate) },
          ]} />
      </DrawerSection>

      <DrawerSection title="Subscription history">
        <DataTable caption="Subscription history" dense maxHeight="240px" rows={m.subs} rowKey={(r) => r.id} initialSort={{ key: 'd', dir: 'desc' }}
          columns={[
            { key: 'd', header: 'Requested', render: (r) => date(r.requestedOn), sort: (r) => r.requestedOn },
            { key: 't', header: 'Tranche', render: (r) => tr.get(r.trancheId)!.name },
            { key: 'a', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </DrawerSection>

      <DrawerSection title="Transaction timeline">
        <DataTable caption="Wallet transactions" dense maxHeight="260px" rows={m.txns} rowKey={(r) => r.id} initialSort={{ key: 'd', dir: 'desc' }}
          empty={<p className="text-[13px] text-ink-3">No wallet transactions.</p>}
          columns={[
            { key: 'd', header: 'Date', render: (r) => date(r.date), sort: (r) => r.date },
            { key: 'ty', header: 'Type', render: (r) => r.type },
            { key: 'a', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'n', header: 'Note', render: (r) => <span className="text-ink-3">{r.note}</span>, secondary: true },
          ]} />
      </DrawerSection>
    </Drawer>
  );
}
