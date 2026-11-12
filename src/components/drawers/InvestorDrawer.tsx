import { AS_OF } from '../../data/asOf';
import { INVESTORS } from '../../data/investors';
import { PROFILE_CHANGES } from '../../data/profileChanges';
import { TRANCHES } from '../../data/tranches';
import { date, rm } from '../../lib/format';
import { investorLabel } from '../../lib/identity';
import { investorMetrics, isCurrentAt } from '../../lib/selectors/investors';
import { useApp } from '../../state/AppState';
import { StatusBadge } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { Drawer, DrawerSection, NeedsLine } from '../ui/Drawer';
import { Field, InfoTip } from '../ui/Primitives';

export function InvestorDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { openDrawer } = useApp();
  const inv = INVESTORS.find((i) => i.id === id);
  if (!inv) return null;
  const m = investorMetrics(inv);
  const tr = new Map(TRANCHES.map((t) => [t.id, t]));
  const current = m.subs.filter((s) => isCurrentAt(s, AS_OF));
  const changes = PROFILE_CHANGES.filter((c) => c.investorId === inv.id).sort((a, b) => b.date.localeCompare(a.date));
  const pendingChange = changes.find((c) => c.status === 'Pending review');

  return (
    <Drawer open onClose={onClose} title={investorLabel(inv)} eyebrow={`${inv.type} investor`}
      headerExtra={<>
        <StatusBadge status={inv.accountStatus} />
        <StatusBadge status={`CTOS ${inv.ctos.toLowerCase()}`} />
        <StatusBadge status={`KYC ${inv.kyc.toLowerCase()}`} />
      </>}>
      {pendingChange && <NeedsLine label="Review" text={`${pendingChange.summary} on ${date(pendingChange.date)}. Verify before the next withdrawal.`} tone="warn" />}
      {inv.issues.length > 0 && <NeedsLine label="Issue" text={inv.issues[0]} tone={m.failedTopUps ? 'crit' : 'warn'} />}

      <DrawerSection title="Key facts" aside={<InfoTip text="Identity numbers, addresses, bank details, identity documents and CTOS report content are deliberately not shown." label="What is not shown" />}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Current subscriptions"><span className="num font-display text-[20px] font-semibold">{rm(m.current)}</span></Field>
          <Field label="Total deposited"><span className="num font-display text-[20px] font-semibold">{rm(m.deposits)}</span></Field>
          <Field label="Wallet balance"><span className="num">{rm(m.wallet)}</span></Field>
          <Field label="Failed top-ups"><span className={`num ${m.failedTopUps ? 'font-semibold text-crit' : ''}`}>{m.failedTopUps ? `${m.failedTopUps} · ${rm(m.failedTopUpAmount)}` : 'None'}</span></Field>
        </dl>
      </DrawerSection>

      <DrawerSection folded title="More figures">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Lifetime allocated"><span className="num">{rm(m.lifetimeAllocated)}</span></Field>
          <Field label="Completed withdrawals"><span className="num">{rm(m.withdrawals)} ({m.withdrawalCount})</span></Field>
          <Field label="Pending requests"><span className="num">{rm(m.pending)}</span></Field>
          <Field label="Last activity">{date(inv.lastActivity)}</Field>
          <Field label="Registered">{date(inv.registeredOn)}</Field>
          <Field label="Approved">{date(inv.approvedOn)}</Field>
        </dl>
      </DrawerSection>

      {changes.length > 0 && (
        <DrawerSection folded title={`Profile changes (${changes.length})`}>
          <ul className="space-y-2.5">
            {changes.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 text-[13px]">
                <span>{c.summary}<span className="num block text-[12px] text-ink-3">{date(c.date)}, {c.time} · {c.type}</span></span>
                <StatusBadge status={c.status} tone={c.status === 'Completed' ? 'good' : 'warn'} />
              </li>
            ))}
          </ul>
        </DrawerSection>
      )}

      <DrawerSection folded title={`Current subscriptions (${current.length})`}>
        <DataTable caption="Current subscriptions" dense rows={current} rowKey={(r) => r.id} onRowClick={(r) => openDrawer({ kind: 'tranche', id: r.trancheId })}
          empty={<p className="text-[13px] text-ink-3">None.</p>}
          columns={[
            { key: 't', header: 'Tranche', render: (r) => tr.get(r.trancheId)!.name },
            { key: 'a', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
          ]} />
      </DrawerSection>

      <DrawerSection folded title={`Subscription history (${m.subs.length})`}>
        <DataTable caption="Subscription history" dense maxHeight="240px" rows={m.subs} rowKey={(r) => r.id} initialSort={{ key: 'd', dir: 'desc' }}
          columns={[
            { key: 'd', header: 'Date', render: (r) => date(r.requestedOn), sort: (r) => r.requestedOn },
            { key: 't', header: 'Tranche', render: (r) => tr.get(r.trancheId)!.name },
            { key: 'a', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </DrawerSection>

      <DrawerSection folded title={`Transactions (${m.txns.length})`}>
        <DataTable caption="Wallet transactions" dense maxHeight="260px" rows={m.txns} rowKey={(r) => r.id} initialSort={{ key: 'd', dir: 'desc' }}
          empty={<p className="text-[13px] text-ink-3">None.</p>}
          columns={[
            { key: 'd', header: 'Date', render: (r) => date(r.date), sort: (r) => r.date },
            { key: 'ty', header: 'Type', render: (r) => r.type },
            { key: 'a', header: 'Amount', align: 'right', render: (r) => rm(r.amount), sort: (r) => r.amount },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </DrawerSection>
    </Drawer>
  );
}
