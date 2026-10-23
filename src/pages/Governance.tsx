import { FileCheck2, FileX2, Link2 } from 'lucide-react';
import { useState } from 'react';
import { OWNERS } from '../components/drawers/GovernanceDrawer';
import { StatusBadge, toneFor } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { KpiCard } from '../components/ui/KpiCard';
import { Card, Chips, EmptyState, Progress, SearchInput, Select, Tabs } from '../components/ui/Primitives';
import { daysFromAsOf } from '../data/asOf';
import { BOARD_DATES } from '../data/governance';
import type { GovActionType, GovBody, GovCategory, GovItem } from '../data/types';
import { date, int, relDays } from '../lib/format';
import { govDueState, govKpis, govOpen, govOverdue, govPrepMissed, isApplication, isPolicy, type DueState } from '../lib/selectors/ops';
import { useApp, useParam } from '../state/AppState';

type Tab = 'mine' | 'ceo' | 'board' | 'policies' | 'all';
const BODIES: GovBody[] = ['CEO', 'Senior Management Team', 'Board', 'Department owner', 'External authority'];
const ACTIONS: GovActionType[] = ['For Information', 'Review', 'Endorsement', 'Approval', 'Decision', 'Acknowledgement', 'Submission', 'Update Required'];
const CATEGORIES: GovCategory[] = ['Policy and procedure', 'Regulatory application', 'Regulatory submission', 'Board paper', 'Management paper', 'Risk acceptance', 'Technology or cybersecurity update', 'Audit and compliance action', 'Brand or trademark matter', 'Contract or legal matter', 'Issuer matter', 'Strategic initiative'];
const STAGES = ['Drafting', 'Internal Review', 'Management Review', 'Ready for Submission', 'Submitted', 'Approved', 'Endorsed', 'Noted', 'Rejected', 'Closed'];
const DUE_STATES: DueState[] = ['Overdue', 'Due soon', 'On track', 'Not started', 'Complete'];
const DUE_TONE: Record<DueState, 'crit' | 'warn' | 'good' | 'mute'> = { Overdue: 'crit', 'Due soon': 'warn', 'On track': 'good', 'Not started': 'mute', Complete: 'good' };

const docCell = (g: GovItem) => (g.documentLink
  ? <span title={g.documentLink} className="text-good"><FileCheck2 size={15} aria-hidden /><span className="sr-only">Document linked</span></span>
  : <span title="No supporting document" className="text-ink-3"><FileX2 size={15} aria-hidden /><span className="sr-only">No document</span></span>);

const daysCell = (g: GovItem) => {
  if (!govOpen(g)) return <span className="text-ink-3">Done</span>;
  const d = daysFromAsOf(g.targetDate);
  return <span className={d < 0 ? 'font-semibold text-crit' : d <= 14 ? 'font-medium text-warn' : 'text-ink-2'}>{relDays(d)}</span>;
};

function govColumns(compact = false): Column<GovItem>[] {
  const cols: Column<GovItem>[] = [
    { key: 'title', header: 'Action or document', render: (g) => <span className="block min-w-[240px] font-medium">{g.title}<span className="block text-[11.5px] font-normal text-ink-3">{g.id} · {g.category}</span></span>, sort: (g) => g.title },
    { key: 'body', header: 'Governance body', render: (g) => <span className="whitespace-nowrap">{g.body}</span>, sort: (g) => g.body },
    { key: 'action', header: 'Action type', render: (g) => <span className="whitespace-nowrap">{g.actionType}</span>, sort: (g) => g.actionType },
    { key: 'owner', header: 'Owner', render: (g) => <span className="whitespace-nowrap">{g.owner}<span className="block text-[11.5px] text-ink-3">Supports: {g.supportingDept}</span></span>, sort: (g) => g.owner },
    { key: 'target', header: 'Target date', render: (g) => <span className="num whitespace-nowrap">{date(g.targetDate)}<span className={`block text-[11.5px] ${govPrepMissed(g) ? 'text-crit' : 'text-ink-3'}`}>Prep {date(g.prepDeadline)}</span></span>, sort: (g) => g.targetDate },
    { key: 'days', header: 'Days', align: 'right', render: daysCell, sort: (g) => (govOpen(g) ? daysFromAsOf(g.targetDate) : 9999) },
    { key: 'stage', header: 'Stage', render: (g) => <StatusBadge status={g.stage} />, sort: (g) => STAGES.indexOf(g.stage) },
    { key: 'due', header: 'Deadline status', render: (g) => { const s = govDueState(g); return <StatusBadge status={s} tone={DUE_TONE[s]} />; }, sort: (g) => DUE_STATES.indexOf(govDueState(g)) },
    { key: 'pri', header: 'Priority', render: (g) => <StatusBadge status={g.priority} tone={g.priority === 'High' ? 'warn' : 'mute'} />, sort: (g) => ['High', 'Medium', 'Low'].indexOf(g.priority) },
    { key: 'ready', header: 'Readiness', align: 'right', render: (g) => <div className="ml-auto w-20"><div className="mb-1">{g.readiness}%</div><Progress value={g.readiness / 100} tone={g.readiness >= 80 ? 'good' : g.readiness >= 50 ? 'accent' : 'warn'} /></div>, sort: (g) => g.readiness },
    { key: 'blocker', header: 'Blocker', render: (g) => (g.blocker ? <span className="block min-w-[160px] text-crit">{g.blocker}</span> : <span className="text-ink-3">—</span>) },
    { key: 'next', header: 'Next required action', render: (g) => <span className="block min-w-[200px] text-ink-2">{g.nextAction}</span>, secondary: true },
    { key: 'upd', header: 'Latest update', render: (g) => <span className="block min-w-[200px] text-ink-3">{g.latestUpdate}</span>, secondary: true },
    { key: 'doc', header: 'Doc', align: 'center', render: docCell },
  ];
  return compact ? cols.filter((c) => !['body', 'upd', 'pri'].includes(c.key)) : cols;
}

export function GovernancePage() {
  const { governance, role, mgmtOwner, dispatch, openDrawer, setParams } = useApp();
  const [tab] = useParam('tab', 'mine');
  const [q, setQ] = useState('');
  const [category, setCategory] = useParam('category');
  const [body, setBody] = useParam('body');
  const [action, setAction] = useParam('action');
  const [stage, setStage] = useParam('stage');
  const [due, setDue] = useParam('due');
  const [owner, setOwner] = useParam('owner');
  const [kpi, setKpi] = useParam('kpi');
  const k = govKpis(governance);

  const KPI_SETS: Record<string, { label: string; ids: Set<string> }> = {
    decisions: { label: 'Decisions awaiting approval', ids: new Set(k.decisions.map((g) => g.id)) },
    overdue: { label: 'Overdue', ids: new Set(k.overdue.map((g) => g.id)) },
    board30: { label: 'Board matters due within 30 days', ids: new Set(k.board30.map((g) => g.id)) },
    policies: { label: 'Policies due for review', ids: new Set(k.policiesDue.map((g) => g.id)) },
    applications: { label: 'Applications awaiting action', ids: new Set(k.applications.map((g) => g.id)) },
    blocked: { label: 'Blocked high-priority', ids: new Set(k.blocked.map((g) => g.id)) },
  };
  const goKpi = (key: string) => setParams({ tab: 'all', kpi: key });

  const mine = governance.filter((g) => (role === 'CEO'
    ? g.body === 'CEO' || g.owner === 'CEO' || (g.blocker ?? '').includes('CEO')
    : g.owner === mgmtOwner));

  const filterAll = (rows: GovItem[]) => rows.filter((g) => {
    if (kpi && !KPI_SETS[kpi]?.ids.has(g.id)) return false;
    if (category && g.category !== category) return false;
    if (body && g.body !== body) return false;
    if (action && g.actionType !== action) return false;
    if (stage && g.stage !== stage) return false;
    if (due && govDueState(g) !== due) return false;
    if (owner && g.owner !== owner) return false;
    if (q && !`${g.id} ${g.title} ${g.category} ${g.owner}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const chips = [
    kpi && { key: 'kpi', label: KPI_SETS[kpi]?.label ?? kpi, onRemove: () => setKpi('') },
    category && { key: 'c', label: category, onRemove: () => setCategory('') },
    body && { key: 'b', label: `Body: ${body}`, onRemove: () => setBody('') },
    action && { key: 'a', label: `Action: ${action}`, onRemove: () => setAction('') },
    stage && { key: 's', label: `Stage: ${stage}`, onRemove: () => setStage('') },
    due && { key: 'd', label: `Deadline: ${due}`, onRemove: () => setDue('') },
    owner && { key: 'o', label: `Owner: ${owner}`, onRemove: () => setOwner('') },
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const open = (g: GovItem) => openDrawer({ kind: 'governance', id: g.id });
  const activeTab = tab as Tab;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Decisions awaiting approval" value={int(k.decisions.length)} sub={`${k.decisions.filter((g) => g.body === 'CEO').length} CEO · ${k.decisions.filter((g) => g.body === 'Board').length} Board · ${k.decisions.filter((g) => g.body === 'Senior Management Team').length} SMT`} onClick={() => goKpi('decisions')} />
        <KpiCard label="Governance items overdue" value={int(k.overdue.length)} tone={k.overdue.length ? 'crit' : undefined}
          delta={{ text: k.overdue.length ? `${k.overdue.length} above target of 0` : 'At target of 0', direction: k.overdue.length ? 'up' : 'flat', good: k.overdue.length ? false : null }}
          sub={`${governance.filter(govPrepMissed).length} more past internal preparation deadline`} onClick={() => goKpi('overdue')} />
        <KpiCard label="Board matters due within 30 days" value={int(k.board30.length)} sub={`${k.board30.filter((g) => g.readiness < 50).length} below 50% ready`} onClick={() => setParams({ tab: 'board' })} />
        <KpiCard label="Policies due for review" value={int(k.policiesDue.length)} sub="Next review within 60 days or overdue" onClick={() => setParams({ tab: 'policies' })} />
        <KpiCard label="Applications awaiting action" value={int(k.applications.length)} sub={`${k.applications.filter((g) => g.application?.missingInfo).length} with missing information`} onClick={() => setParams({ tab: 'policies' })} />
        <KpiCard label="Blocked high-priority items" value={int(k.blocked.length)} tone={k.blocked.length ? 'warn' : undefined} sub="Open, high priority, with a recorded blocker" onClick={() => goKpi('blocked')} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Governance view" value={activeTab} onChange={(t) => setParams(t === 'mine' ? {} : { tab: t })}
          tabs={[
            { key: 'mine', label: 'My Actions', count: mine.filter(govOpen).length },
            { key: 'ceo', label: 'CEO & Management', count: governance.filter((g) => govOpen(g) && (g.body === 'CEO' || g.body === 'Senior Management Team')).length },
            { key: 'board', label: 'Board Pipeline', count: governance.filter((g) => govOpen(g) && g.boardMeeting).length },
            { key: 'policies', label: 'Policies & Applications', count: governance.filter((g) => govOpen(g) && (isPolicy(g) || isApplication(g))).length },
            { key: 'all', label: 'All Governance Items', count: governance.length },
          ]} />
        <p className="text-[12px] text-ink-3">Updates here are demo changes held in this browser session only.</p>
      </div>

      {activeTab === 'mine' && (
        <Card bodyClass="p-0" title={role === 'CEO' ? 'My Actions · CEO' : `My Actions · ${mgmtOwner}`}
          subtitle={role === 'CEO' ? 'Items requiring a CEO decision, approval or signature' : 'Items where you are the accountable owner'}
          actions={role === 'Management' ? (
            <Select id="persona" label="Viewing as" value={mgmtOwner} onChange={(v) => dispatch({ type: 'mgmtOwner', value: v })} options={OWNERS.filter((o) => o !== 'CEO').map((o) => ({ value: o, label: o }))} />
          ) : undefined}>
          <DataTable caption="My actions" rows={[...mine].sort((a, b) => Number(govOpen(b)) - Number(govOpen(a)))} rowKey={(g) => g.id} onRowClick={open} columns={govColumns(true)}
            initialSort={{ key: 'days', dir: 'asc' }}
            empty={<EmptyState title="Nothing assigned to you" body="No governance items list you as the accountable owner. Choose another department head above." />} />
        </Card>
      )}

      {activeTab === 'ceo' && (
        <Card bodyClass="p-0" title="CEO & Senior Management Team" subtitle="Operational decisions and management papers. These items do not need Board submission.">
          <DataTable caption="CEO and management items" rows={governance.filter((g) => g.body === 'CEO' || g.body === 'Senior Management Team')} rowKey={(g) => g.id} onRowClick={open}
            columns={govColumns()} initialSort={{ key: 'days', dir: 'asc' }} />
        </Card>
      )}

      {activeTab === 'board' && <BoardPipeline items={governance} onOpen={open} />}

      {activeTab === 'policies' && (
        <div className="space-y-6">
          <Card bodyClass="p-0" title="Policies" subtitle="Review cycle and approval body">
            <DataTable<GovItem> caption="Policies" rows={governance.filter(isPolicy)} rowKey={(g) => g.id} onRowClick={open} initialSort={{ key: 'next', dir: 'asc' }}
              columns={[
                { key: 'name', header: 'Policy', render: (g) => <span className="block min-w-[220px] font-medium">{g.title.replace(/ (annual )?review.*$/i, '')}<span className="block text-[11.5px] font-normal text-ink-3">{g.id}</span></span>, sort: (g) => g.title },
                { key: 'owner', header: 'Policy owner', render: (g) => <span className="whitespace-nowrap">{g.owner}</span>, sort: (g) => g.owner },
                { key: 'ver', header: 'Version', render: (g) => <span className="whitespace-nowrap">{g.policy!.version}</span> },
                { key: 'last', header: 'Last review', render: (g) => <span className="num whitespace-nowrap">{date(g.policy!.lastReview)}</span>, sort: (g) => g.policy!.lastReview },
                { key: 'next', header: 'Next review', render: (g) => <span className="num whitespace-nowrap">{date(g.policy!.nextReview)}</span>, sort: (g) => g.policy!.nextReview },
                { key: 'days', header: 'Days until due', align: 'right', render: (g) => (govOpen(g) ? daysCell({ ...g, targetDate: g.policy!.nextReview }) : <span className="text-ink-3">Done</span>), sort: (g) => daysFromAsOf(g.policy!.nextReview) },
                { key: 'body', header: 'Approval body', render: (g) => g.body },
                { key: 'stage', header: 'Status', render: (g) => <StatusBadge status={govOverdue(g) ? 'Overdue' : g.stage} /> },
                { key: 'chg', header: 'Proposed changes', render: (g) => <span className="block min-w-[220px] text-ink-2">{g.policy!.proposedChanges}</span> },
                { key: 'req', header: 'Related requirement', render: (g) => <span className="text-ink-3">{g.policy!.requirementRef}</span>, secondary: true },
                { key: 'doc', header: 'Evidence', align: 'center', render: docCell },
              ]} />
          </Card>
          <Card bodyClass="p-0" title="Applications and submissions" subtitle="Regulatory and business applications (synthetic authorities)">
            <DataTable<GovItem> caption="Applications" rows={governance.filter(isApplication)} rowKey={(g) => g.id} onRowClick={open} initialSort={{ key: 'dl', dir: 'asc' }}
              columns={[
                { key: 'name', header: 'Application', render: (g) => <span className="block min-w-[220px] font-medium">{g.title.replace(/^Application: /, '')}<span className="block text-[11.5px] font-normal text-ink-3">{g.id}</span></span>, sort: (g) => g.title },
                { key: 'type', header: 'Type', render: (g) => <span className="whitespace-nowrap">{g.application!.applicationType}</span> },
                { key: 'auth', header: 'Authority / recipient', render: (g) => <span className="text-ink-2">{g.application!.authority}</span> },
                { key: 'owner', header: 'Owner', render: (g) => <span className="whitespace-nowrap">{g.owner}</span> },
                { key: 'dl', header: 'Submission deadline', render: (g) => <span className="num whitespace-nowrap">{date(g.targetDate)}<span className="block">{daysCell(g)}</span></span>, sort: (g) => g.targetDate },
                { key: 'stage', header: 'Stage', render: (g) => <StatusBadge status={govOverdue(g) ? 'Overdue' : g.stage} /> },
                { key: 'miss', header: 'Missing information', render: (g) => (g.application!.missingInfo ? <span className="block min-w-[180px] text-warn">{g.application!.missingInfo}</span> : <span className="text-ink-3">None</span>) },
                { key: 'block', header: 'Blocker', render: (g) => (g.blocker ? <span className="block min-w-[160px] text-crit">{g.blocker}</span> : <span className="text-ink-3">—</span>) },
                { key: 'next', header: 'Next action', render: (g) => <span className="block min-w-[180px] text-ink-2">{g.nextAction}</span> },
                { key: 'appr', header: 'Approval required', render: (g) => g.application!.approvalRequired },
                { key: 'upd', header: 'Latest update', render: (g) => <span className="block min-w-[180px] text-ink-3">{g.latestUpdate}</span>, secondary: true },
              ]} />
          </Card>
        </div>
      )}

      {activeTab === 'all' && (
        <Card bodyClass="p-0" title="All governance items" subtitle={`${filterAll(governance).length} of ${governance.length} items`}>
          <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3">
            <SearchInput id="gov-q" value={q} onChange={setQ} placeholder="Title, ID or owner" />
            <Select id="gov-cat" label="Category" value={category} onChange={setCategory} options={[{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
            <Select id="gov-body" label="Governance body" value={body} onChange={setBody} options={[{ value: '', label: 'Any body' }, ...BODIES.map((c) => ({ value: c, label: c }))]} />
            <Select id="gov-action" label="Action type" value={action} onChange={setAction} options={[{ value: '', label: 'Any action' }, ...ACTIONS.map((c) => ({ value: c, label: c }))]} />
            <Select id="gov-stage" label="Workflow stage" value={stage} onChange={setStage} options={[{ value: '', label: 'Any stage' }, ...STAGES.map((c) => ({ value: c, label: c }))]} />
            <Select id="gov-due" label="Deadline status" value={due} onChange={setDue} options={[{ value: '', label: 'Any' }, ...DUE_STATES.map((c) => ({ value: c, label: c }))]} />
            <Select id="gov-owner" label="Owner" value={owner} onChange={setOwner} options={[{ value: '', label: 'Any owner' }, ...OWNERS.map((c) => ({ value: c, label: c }))]} />
          </div>
          {chips.length > 0 && <div className="border-b border-line px-5 py-2.5"><Chips chips={chips} onClear={() => { setQ(''); setParams({ tab: 'all' }); }} /></div>}
          <DataTable caption="All governance items" rows={filterAll(governance)} rowKey={(g) => g.id} onRowClick={open} columns={govColumns()} maxHeight="640px" initialSort={{ key: 'days', dir: 'asc' }} />
        </Card>
      )}
    </div>
  );
}

function BoardPipeline({ items, onOpen }: { items: GovItem[]; onOpen: (g: GovItem) => void }) {
  const groups = Object.entries(BOARD_DATES).sort((a, b) => a[1].localeCompare(b[1]));
  return (
    <div className="space-y-6">
      {groups.map(([label, d]) => {
        const rows = items.filter((g) => g.boardMeeting === label);
        const openRows = rows.filter(govOpen);
        const ready = openRows.filter((g) => g.readiness >= 90 || ['Ready for Submission', 'Submitted'].includes(g.stage));
        const atRisk = openRows.filter((g) => !ready.includes(g) && (govPrepMissed(g) || govOverdue(g) || !!g.blocker || g.readiness < 40));
        const missingPapers = openRows.filter((g) => !g.documentLink);
        const missingApprovals = openRows.filter((g) => ['Drafting', 'Internal Review'].includes(g.stage));
        const blocked = openRows.filter((g) => g.dependencies.length > 0);
        const days = daysFromAsOf(d);
        const stats: [string, number, 'crit' | 'warn' | 'good' | 'mute'][] = [
          ['Planned matters', rows.length, 'mute'], ['Ready', ready.length, 'good'], ['At risk', atRisk.length, atRisk.length ? 'crit' : 'mute'],
          ['Missing papers', missingPapers.length, missingPapers.length ? 'warn' : 'mute'], ['Missing management approval', missingApprovals.length, missingApprovals.length ? 'warn' : 'mute'],
          ['Blocked by dependencies', blocked.length, blocked.length ? 'warn' : 'mute'],
        ];
        return (
          <Card key={label} title={label} subtitle={`${date(d)} · ${days} days away`} bodyClass="p-0"
            actions={<StatusBadge status={atRisk.length ? `${atRisk.length} at risk of delay` : 'On track'} tone={atRisk.length ? 'crit' : 'good'} />}>
            <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
              {stats.map(([l, n, t]) => (
                <div key={l} className="bg-surface px-4 py-3">
                  <dt className="text-[11.5px] text-ink-3">{l}</dt>
                  <dd className={`num font-display text-[20px] font-semibold ${t === 'crit' ? 'text-crit' : t === 'warn' ? 'text-warn' : t === 'good' ? 'text-good' : ''}`}>{n}</dd>
                </div>
              ))}
            </dl>
            <ul className="divide-y divide-line">
              {rows.map((g) => {
                const risk = atRisk.includes(g) ? 'High' : ready.includes(g) ? 'Low' : 'Medium';
                return (
                  <li key={g.id}>
                    <button onClick={() => onOpen(g)} className="grid w-full grid-cols-1 gap-3 px-5 py-3.5 text-left hover:bg-sunken/60 lg:grid-cols-12 lg:items-center">
                      <div className="lg:col-span-4">
                        <div className="text-[13.5px] font-semibold">{g.title}</div>
                        <div className="text-[12px] text-ink-3">{g.id} · {g.owner} · Board action: {g.actionType}</div>
                      </div>
                      <div className="text-[12.5px] lg:col-span-2">
                        <div className="text-ink-3">Internal deadline</div>
                        <div className={`num ${govPrepMissed(g) ? 'font-semibold text-crit' : ''}`}>{date(g.prepDeadline)}{govPrepMissed(g) ? ' · missed' : ''}</div>
                      </div>
                      <div className="lg:col-span-2">
                        <div className="mb-1 flex justify-between text-[12px]"><span className="text-ink-3">Readiness</span><span className="num">{g.readiness}%</span></div>
                        <Progress value={g.readiness / 100} tone={g.readiness >= 80 ? 'good' : g.readiness >= 50 ? 'accent' : 'warn'} />
                      </div>
                      <div className="text-[12.5px] lg:col-span-2">
                        <div className="text-ink-3">Dependencies</div>
                        <div className="flex items-center gap-1">{g.dependencies.length ? g.dependencies.join(', ') : 'None'}{!g.documentLink && <span className="ml-1 inline-flex items-center gap-0.5 text-warn"><Link2 size={12} aria-hidden />no paper</span>}</div>
                      </div>
                      <div className="flex flex-col items-start gap-1 lg:col-span-2 lg:items-end">
                        <StatusBadge status={g.stage} />
                        <StatusBadge status={`${risk} delay risk`} tone={toneFor(risk === 'High' ? 'critical' : risk === 'Medium' ? 'attention' : 'on track')} />
                      </div>
                      <p className="text-[12px] text-ink-2 lg:col-span-12">Latest: {g.latestUpdate}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
