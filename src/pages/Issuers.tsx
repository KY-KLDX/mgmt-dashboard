import { FileCheck2, FileX2 } from 'lucide-react';
import { useState } from 'react';
import { ObligationTimeline } from '../components/charts/Timeline';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { KpiCard } from '../components/ui/KpiCard';
import { Card, Chips, SearchInput, Select, Tabs } from '../components/ui/Primitives';
import { daysFromAsOf } from '../data/asOf';
import { ISSUERS } from '../data/issuers';
import { OBLIGATIONS } from '../data/obligations';
import type { Obligation, ObligationType } from '../data/types';
import { date, dateShort, int, relDays } from '../lib/format';
import { issuerShort, trancheById } from '../lib/selectors/finance';
import { issuerKpis, obligationOpen, obligationOverdue, timelineEvents } from '../lib/selectors/ops';
import { useApp, useParam } from '../state/AppState';

const TYPES: ObligationType[] = ['Tranche opening', 'Tranche closing', 'Issuance', 'Settlement', 'Profit payment', 'Principal repayment', 'Issuer reporting', 'Document renewal', 'Application submission', 'Regulatory submission', 'Approval expiry', 'Brand / trademark deadline'];
const STATUSES = ['Not started', 'In progress', 'At risk', 'Awaiting issuer', 'Completed'];

export function IssuersPage() {
  const { openDrawer, setParams } = useApp();
  const [horizon, setHorizon] = useState<'30' | '60' | '90'>('30');
  const [issuer, setIssuer] = useParam('issuer');
  const [type, setType] = useParam('type');
  const [status, setStatus] = useParam('status');
  const [risk, setRisk] = useParam('risk');
  const [owner, setOwner] = useParam('owner');
  const [due, setDue] = useParam('due');
  const [q, setQ] = useParam('q');
  const k = issuerKpis();
  const events = timelineEvents();

  const rows = OBLIGATIONS.filter((o) => {
    if (issuer && o.issuerId !== issuer) return false;
    if (type && o.type !== type) return false;
    if (status && o.status !== status) return false;
    if (risk === 'high' && !(o.risk === 'High' || o.risk === 'Critical')) return false;
    if (risk && risk !== 'high' && o.risk !== risk) return false;
    if (owner && o.owner !== owner) return false;
    const d = daysFromAsOf(o.dueDate);
    if (due === 'overdue' && !obligationOverdue(o)) return false;
    if (due === '30' && !(obligationOpen(o) && d >= 0 && d <= 30)) return false;
    if (due === '90' && !(obligationOpen(o) && d >= 0 && d <= 90)) return false;
    if (due === 'applications' && !(obligationOpen(o) && (o.type === 'Application submission' || o.type === 'Regulatory submission'))) return false;
    if (q && !`${o.id} ${o.title} ${issuerShort(o.issuerId)}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const owners = [...new Set(OBLIGATIONS.map((o) => o.owner))].sort();
  const DUE_LABEL: Record<string, string> = { overdue: 'Overdue', '30': 'Due within 30 days', '90': 'Due within 90 days', applications: 'Applications and submissions' };
  const chips = [
    issuer && { key: 'i', label: `Issuer: ${issuerShort(issuer)}`, onRemove: () => setIssuer('') },
    type && { key: 't', label: `Type: ${type}`, onRemove: () => setType('') },
    status && { key: 's', label: `Status: ${status}`, onRemove: () => setStatus('') },
    risk && { key: 'r', label: `Risk: ${risk === 'high' ? 'High or Critical' : risk}`, onRemove: () => setRisk('') },
    owner && { key: 'o', label: `Owner: ${owner}`, onRemove: () => setOwner('') },
    due && { key: 'd', label: DUE_LABEL[due], onRemove: () => setDue('') },
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];
  const scrollToTable = () => window.setTimeout(() => document.getElementById('obligations')?.scrollIntoView({ behavior: 'smooth' }), 50);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <KpiCard label="Active issuers" value={int(k.activeIssuers)} sub={`of ${ISSUERS.length} onboarded · with live, outstanding or upcoming tranches`} />
        <KpiCard label="Live tranches" value={int(k.liveTranches)} sub="Open or fully subscribed, before close" onClick={() => setParams({})} />
        <KpiCard label="Next issuer event" value={k.next ? dateShort(k.next.date) : '—'}
          sub={k.next ? <><span className="font-medium text-ink-2">{k.next.title}</span> · {relDays(daysFromAsOf(k.next.date))}</> : 'Nothing scheduled'}
          onClick={k.next ? () => openDrawer({ kind: 'issuer', id: k.next!.issuerId }) : undefined} />
        <KpiCard label="Events due within 30 days" value={int(k.within30)} sub="Obligations and scheduled tranche events" onClick={() => { setParams({ due: '30' }); scrollToTable(); }} />
        <KpiCard label="Overdue issuer obligations" value={int(k.overdue.length)} tone={k.overdue.length ? 'crit' : undefined}
          delta={{ text: k.overdue.length ? `${k.overdue.length} above target of 0` : 'At target of 0', direction: k.overdue.length ? 'up' : 'flat', good: k.overdue.length ? false : null }}
          onClick={() => { setParams({ due: 'overdue' }); scrollToTable(); }} />
        <KpiCard label="Applications pending" value={int(k.applicationsPending.length)} sub="Issuer applications and regulatory submissions" onClick={() => { setParams({ due: 'applications' }); scrollToTable(); }} />
        <KpiCard label="High-risk deadlines" value={int(k.highRisk.length)} tone={k.highRisk.length ? 'warn' : undefined} sub="High or Critical risk, overdue or due within 30 days"
          onClick={() => { setParams({ risk: 'high' }); scrollToTable(); }} />
      </div>

      <Card title="Upcoming obligations timeline" subtitle="Issuer obligations and scheduled tranche events. Dot colour and label show risk level."
        actions={<Tabs label="Timeline horizon" value={horizon} onChange={setHorizon} tabs={[{ key: '30', label: '30 days' }, { key: '60', label: '60 days' }, { key: '90', label: '90 days' }]} />}>
        <ObligationTimeline horizon={Number(horizon)} events={events} overdue={events.filter((e) => daysFromAsOf(e.date) < 0)}
          onOpen={(e) => openDrawer({ kind: 'issuer', id: e.issuerId })} />
      </Card>

      <Card id="obligations" className="scroll-mt-36" title="Issuer obligations" bodyClass="p-0" subtitle={`${rows.length} of ${OBLIGATIONS.length} obligations · select a row to open the issuer`}>
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3">
          <SearchInput id="ob-q" value={q} onChange={setQ} placeholder="Obligation, issuer or ID" />
          <Select id="ob-issuer" label="Issuer" value={issuer} onChange={setIssuer} options={[{ value: '', label: 'All issuers' }, ...ISSUERS.map((i) => ({ value: i.id, label: issuerShort(i.id) }))]} />
          <Select id="ob-type" label="Obligation type" value={type} onChange={setType} options={[{ value: '', label: 'All types' }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
          <Select id="ob-due" label="Date range" value={due} onChange={setDue} options={[{ value: '', label: 'Any date' }, { value: 'overdue', label: 'Overdue' }, { value: '30', label: 'Next 30 days' }, { value: '90', label: 'Next 90 days' }]} />
          <Select id="ob-status" label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'Any status' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
          <Select id="ob-risk" label="Risk" value={risk} onChange={setRisk} options={[{ value: '', label: 'Any risk' }, { value: 'high', label: 'High or Critical' }, ...['Critical', 'High', 'Medium', 'Low'].map((r) => ({ value: r, label: r }))]} />
          <Select id="ob-owner" label="Owner" value={owner} onChange={setOwner} options={[{ value: '', label: 'Any owner' }, ...owners.map((o) => ({ value: o, label: o }))]} />
        </div>
        {chips.length > 0 && <div className="border-b border-line px-5 py-2.5"><Chips chips={chips} onClear={() => setParams({})} /></div>}
        <DataTable<Obligation> caption="Issuer obligations" rows={rows} rowKey={(o) => o.id} onRowClick={(o) => openDrawer({ kind: 'issuer', id: o.issuerId })} maxHeight="600px"
          initialSort={{ key: 'due', dir: 'asc' }} selectedKey={q && rows.length === 1 ? rows[0].id : null}
          columns={[
            { key: 'issuer', header: 'Issuer', render: (o) => <span className="whitespace-nowrap font-medium">{issuerShort(o.issuerId)}</span>, sort: (o) => issuerShort(o.issuerId) },
            { key: 'tr', header: 'Tranche', render: (o) => <span className="whitespace-nowrap text-ink-2">{o.trancheId ? trancheById(o.trancheId)?.name : '—'}</span>, secondary: true },
            { key: 'title', header: 'Event or obligation', render: (o) => <span className="block min-w-[220px]">{o.title}<span className="block text-[11.5px] text-ink-3">{o.id} · {o.type}</span></span>, sort: (o) => o.title },
            { key: 'due', header: 'Due', render: (o) => <span className="num whitespace-nowrap">{date(o.dueDate)}</span>, sort: (o) => o.dueDate },
            { key: 'days', header: 'Days', align: 'right', render: (o) => (
              <span className={obligationOverdue(o) ? 'font-semibold text-crit' : daysFromAsOf(o.dueDate) <= 7 && obligationOpen(o) ? 'font-medium text-warn' : 'text-ink-2'}>
                {o.status === 'Completed' ? 'Done' : relDays(daysFromAsOf(o.dueDate))}
              </span>
            ), sort: (o) => daysFromAsOf(o.dueDate) },
            { key: 'owner', header: 'Accountable owner', render: (o) => <span className="whitespace-nowrap">{o.owner}<span className="block text-[11.5px] text-ink-3">Supports: {o.supportingDept}</span></span>, sort: (o) => o.owner },
            { key: 'status', header: 'Status', render: (o) => <StatusBadge status={obligationOverdue(o) ? 'Overdue' : o.status} /> },
            { key: 'risk', header: 'Risk', render: (o) => <SeverityBadge severity={o.risk} />, sort: (o) => ['Critical', 'High', 'Medium', 'Low'].indexOf(o.risk) },
            { key: 'next', header: 'Next action', render: (o) => <span className="block min-w-[220px] text-ink-2">{o.nextAction}</span> },
            { key: 'upd', header: 'Latest update', render: (o) => <span className="block min-w-[180px] text-ink-3">{o.latestUpdate}</span>, secondary: true },
            { key: 'doc', header: 'Docs', align: 'center', render: (o) => (o.hasDocument
              ? <span title="Supporting document on file" className="inline-flex items-center gap-1 text-good"><FileCheck2 size={15} aria-hidden /><span className="sr-only">Document on file</span></span>
              : <span title="No supporting document" className="inline-flex items-center gap-1 text-ink-3"><FileX2 size={15} aria-hidden /><span className="sr-only">No document</span></span>) },
          ]} />
      </Card>
    </div>
  );
}
