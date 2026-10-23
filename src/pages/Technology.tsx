import { useState } from 'react';
import { SeverityBadge, StatusBadge, toneFor } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { KpiCard, deltaAbs } from '../components/ui/KpiCard';
import { Card, Chips, ErrorState, Select, Tabs } from '../components/ui/Primitives';
import { daysBetween, AS_OF, daysFromAsOf } from '../data/asOf';
import { AVAILABILITY, CYBER_RISKS, INCIDENTS, RESILIENCE } from '../data/tech';
import type { CyberRisk, Incident } from '../data/types';
import { date, dateTime, int, monthLong } from '../lib/format';
import { incidentOpen, ratingFromScore, riskOverdue, riskRating, riskScore, techKpis, topRisks } from '../lib/selectors/ops';
import { useApp, useParam } from '../state/AppState';

const SEV_ORDER = ['Critical', 'High', 'Medium', 'Low'];

export function TechnologyPage() {
  const { openDrawer, demoError, dispatch, params } = useApp();
  const [sev, setSev] = useParam('severity');
  const [scope, setScope] = useParam('scope', 'open');
  const [cell, setCell] = useState<string | null>(null);
  const k = techKpis();
  const trend = k.riskTrend;
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];

  const incidents = INCIDENTS.filter((i) => (scope === 'open' ? incidentOpen(i) : true) && (!sev || i.severity === sev));
  const risks: CyberRisk[] = cell ? CYBER_RISKS.filter((r) => `${r.likelihood}-${r.impact}` === cell) : topRisks();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Open critical incidents" value={int(k.critical.length)} tone={k.critical.length ? 'crit' : undefined}
          delta={{ text: k.critical.length ? `${k.critical.length} above target of 0` : 'At target of 0', direction: k.critical.length ? 'up' : 'flat', good: k.critical.length ? false : null }}
          sub={k.critical.map((i) => i.service).join(', ') || 'None open'} onClick={() => { setSev('Critical'); }} />
        <KpiCard label="Open high-severity incidents" value={int(k.high.length)} tone={k.high.length ? 'warn' : undefined}
          sub={`${k.high.filter((i) => i.status === 'Monitoring').length} restored and being monitored`} onClick={() => setSev('High')} />
        <KpiCard label="Business services currently affected" value={int(k.affected.length)} tone={k.affected.length ? 'warn' : undefined}
          sub={k.affected.join(' · ') || 'All services operating normally'} />
        <KpiCard label="Overdue corrective actions" value={int(k.overdueActions.length)} tone={k.overdueActions.length ? 'crit' : undefined}
          sub={`${k.overdueActions.filter((a) => a.source.startsWith('INC')).length} incident actions · ${k.overdueActions.filter((a) => a.source.startsWith('CR')).length} risk treatments`}
          onClick={() => document.getElementById('risks')?.scrollIntoView({ behavior: 'smooth' })} />
        <KpiCard label="Services below availability target" value={`${k.belowTarget.length} of ${AVAILABILITY.length}`} tone={k.belowTarget.length ? 'warn' : undefined}
          sub={k.belowTarget.map((a) => `${a.service} ${a.availability}%`).join(' · ')}
          onClick={() => document.getElementById('resilience')?.scrollIntoView({ behavior: 'smooth' })} />
        <KpiCard label="Cyber risk trend" value={`${last.open} elevated`} spark={trend.map((t) => t.open)}
          delta={deltaAbs(last.open, prev.open, `vs ${monthLong(prev.month)}`, false)}
          sub="High or Critical risks with treatment not complete (6 months)" />
      </div>

      <Card title="Incidents" bodyClass="p-0" subtitle="Expressed in business terms. Select a row for the executive summary, actions and timeline."
        actions={<>
          <Select id="inc-sev" label="Severity" hideLabel value={sev} onChange={setSev} options={[{ value: '', label: 'All severities' }, ...SEV_ORDER.map((s) => ({ value: s, label: s }))]} />
          <Tabs label="Incident scope" value={scope as 'open' | 'all'} onChange={setScope} tabs={[{ key: 'open', label: 'Open', count: INCIDENTS.filter(incidentOpen).length }, { key: 'all', label: 'All (90 days)', count: INCIDENTS.length }]} />
        </>}>
        {sev && <div className="border-b border-line px-5 py-2.5"><Chips chips={[{ key: 's', label: `Severity: ${sev}`, onRemove: () => setSev('') }]} onClear={() => setSev('')} /></div>}
        <DataTable<Incident> caption="Incidents" rows={incidents} rowKey={(i) => i.id} onRowClick={(i) => openDrawer({ kind: 'incident', id: i.id })}
          initialSort={{ key: 'sev', dir: 'asc' }}
          columns={[
            { key: 'title', header: 'Incident', render: (i) => <span className="block min-w-[240px] font-medium">{i.title}<span className="block text-[11.5px] font-normal text-ink-3">{i.id} · {i.category}</span></span>, sort: (i) => i.title },
            { key: 'sev', header: 'Severity', render: (i) => <SeverityBadge severity={i.severity} />, sort: (i) => SEV_ORDER.indexOf(i.severity) * 10 + (incidentOpen(i) ? 0 : 5) },
            { key: 'svc', header: 'Business service', render: (i) => <span className="whitespace-nowrap">{i.service}</span>, sort: (i) => i.service },
            { key: 'impact', header: 'Business impact', render: (i) => <span className="block min-w-[260px] text-ink-2">{i.businessImpact}</span> },
            { key: 'det', header: 'Detected', render: (i) => <span className="num whitespace-nowrap">{dateTime(i.detectedAt)}</span>, sort: (i) => i.detectedAt, secondary: true },
            { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} />, sort: (i) => i.status },
            { key: 'owner', header: 'Owner', render: (i) => <span className="whitespace-nowrap">{i.owner}</span>, secondary: true },
            { key: 'target', header: 'Target resolution', render: (i) => (
              <span className={`num whitespace-nowrap ${incidentOpen(i) && i.targetResolution < AS_OF ? 'font-semibold text-crit' : ''}`}>{date(i.targetResolution)}</span>
            ), sort: (i) => i.targetResolution },
            { key: 'age', header: 'Age', align: 'right', render: (i) => `${daysBetween(i.detectedAt.slice(0, 10), AS_OF)}d`, sort: (i) => daysBetween(i.detectedAt.slice(0, 10), AS_OF) },
            { key: 'reg', header: 'Regulatory assessment', render: (i) => <span className="whitespace-nowrap text-ink-2">{i.regulatoryAssessment}</span>, secondary: true },
            { key: 'dec', header: 'Decision required', render: (i) => (i.decisionRequired ? <span className="block min-w-[220px] font-medium text-warn">{i.decisionRequired}</span> : <span className="text-ink-3">—</span>) },
          ]} />
      </Card>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <Card id="risks" className="scroll-mt-36 2xl:col-span-8" bodyClass="p-0"
          title={cell ? `Cyber risks at likelihood ${cell.split('-')[0]} × impact ${cell.split('-')[1]}` : 'Top five cyber risks'}
          subtitle="Ranked by likelihood × impact. Overdue treatment shown in red."
          actions={cell ? <Chips chips={[{ key: 'c', label: `Matrix cell ${cell.replace('-', ' × ')}`, onRemove: () => setCell(null) }]} onClear={() => setCell(null)} /> : undefined}>
          <DataTable<CyberRisk> caption="Top cyber risks" rows={risks} rowKey={(r) => r.id} onRowClick={(r) => openDrawer({ kind: 'risk', id: r.id })}
            initialSort={{ key: 'score', dir: 'desc' }}
            columns={[
              { key: 'title', header: 'Risk', render: (r) => <span className="block min-w-[220px] font-medium">{r.title}<span className="block text-[12px] font-normal text-ink-3">{r.description}</span></span>, sort: (r) => r.title },
              { key: 'area', header: 'Business area', render: (r) => <span className="whitespace-nowrap">{r.area}</span>, secondary: true },
              { key: 'score', header: 'L × I', align: 'right', render: (r) => `${r.likelihood} × ${r.impact}`, sort: (r) => riskScore(r) },
              { key: 'rating', header: 'Rating', render: (r) => <SeverityBadge severity={riskRating(r)} />, sort: (r) => riskScore(r) },
              { key: 'controls', header: 'Existing controls', render: (r) => <span className="block min-w-[180px] text-ink-2">{r.controls}</span>, secondary: true },
              { key: 'treat', header: 'Current treatment', render: (r) => <span className="block min-w-[180px] text-ink-2">{r.treatment}</span> },
              { key: 'owner', header: 'Owner', render: (r) => <span className="whitespace-nowrap">{r.owner}</span> },
              { key: 'target', header: 'Target date', render: (r) => (
                <span className="whitespace-nowrap"><span className={`num ${riskOverdue(r) ? 'font-semibold text-crit' : ''}`}>{date(r.targetDate)}</span>
                  {riskOverdue(r) && <span className="block"><StatusBadge status={`Overdue ${-daysFromAsOf(r.targetDate)}d`} tone="crit" /></span>}
                  {r.treatmentComplete && <span className="block"><StatusBadge status="Complete" /></span>}</span>
              ), sort: (r) => r.targetDate },
              { key: 'res', header: 'Residual', render: (r) => <SeverityBadge severity={r.residual} /> },
              { key: 'trend', header: 'Trend', render: (r) => <StatusBadge status={r.trend} tone={toneFor(r.trend)} /> },
            ]} />
        </Card>
        <Card className="2xl:col-span-4" title="Risk matrix" subtitle={`All ${CYBER_RISKS.length} register risks · select a cell to list its risks`}>
          <RiskMatrix selected={cell} onSelect={setCell} />
        </Card>
      </div>

      <Card id="resilience" className={`scroll-mt-36 ${params.section === 'resilience' ? 'ring-2 ring-accent/40' : ''}`} title="Security and resilience measures"
        subtitle="Synthetic management-level measures. Not a regulatory compliance assessment.">
        {demoError ? (
          <ErrorState title="Resilience measures could not be loaded" body="The synthetic resilience feed is switched off in Demo settings to show this error state. In production this card would show when the source was last updated and who to contact."
            onRetry={() => dispatch({ type: 'demoError', value: false })} />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ul className="divide-y divide-line">
              {RESILIENCE.map((m) => (
                <li key={m.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{m.label}</div>
                    <div className="text-[12px] text-ink-3">{m.note}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="num text-[13px] font-semibold">{m.value}</div>
                    <div className="text-[11.5px] text-ink-3">Target {m.target}</div>
                  </div>
                  <div className="w-24 shrink-0 text-right"><StatusBadge status={m.status} tone={m.status === 'On track' ? 'good' : m.status === 'Attention' ? 'warn' : 'crit'} /></div>
                </li>
              ))}
            </ul>
            <div>
              <h3 className="mb-3 text-[13px] font-semibold">Availability against target · last 30 days</h3>
              <ul className="space-y-3">
                {AVAILABILITY.map((a) => {
                  const below = a.availability < a.target;
                  const scale = (v: number) => ((v - 97) / 3) * 100;
                  return (
                    <li key={a.service}>
                      <div className="mb-1 flex justify-between text-[12.5px]">
                        <span>{a.service}</span>
                        <span className={`num ${below ? 'font-semibold text-warn' : 'text-ink-2'}`}>{a.availability.toFixed(2)}% <span className="font-normal text-ink-3">/ {a.target}%</span> {below ? '▼ below' : '✓'}</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-sunken" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, scale(a.availability))}%`, background: below ? 'rgb(var(--warn))' : 'var(--series-2)' }} />
                        <span className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${scale(a.target)}%` }} title={`Target ${a.target}%`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11.5px] text-ink-3">Bars start at 97%. The black tick marks each service's target.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function RiskMatrix({ selected, onSelect }: { selected: string | null; onSelect: (c: string | null) => void }) {
  const tone = (s: number) => {
    const r = ratingFromScore(s);
    return r === 'Critical' ? 'bg-crit-soft text-crit' : r === 'High' ? 'bg-warn-soft text-warn' : r === 'Medium' ? 'bg-info-soft text-info' : 'bg-mute-soft text-mute';
  };
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex w-5 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-[11px] text-ink-3">Likelihood →</span></div>
        <div className="grid flex-1 grid-cols-5 gap-1" role="grid" aria-label="Risk matrix: likelihood by impact">
          {[5, 4, 3, 2, 1].map((l) => [1, 2, 3, 4, 5].map((i) => {
            const here = CYBER_RISKS.filter((r) => r.likelihood === l && r.impact === i);
            const key = `${l}-${i}`;
            const sel = selected === key;
            return (
              <button key={key} role="gridcell" disabled={!here.length} onClick={() => onSelect(sel ? null : key)}
                aria-label={`Likelihood ${l}, impact ${i}, rating ${ratingFromScore(l * i)}: ${here.length} risks`} aria-pressed={sel}
                className={`flex aspect-square flex-col items-center justify-center rounded-md text-[12px] font-semibold ${tone(l * i)} ${sel ? 'ring-2 ring-ink' : ''} ${here.length ? 'cursor-pointer hover:ring-2 hover:ring-ink/40' : 'cursor-default opacity-60'}`}>
                {here.length ? <><span className="num text-[16px]">{here.length}</span><span className="text-[9.5px] font-medium">{here.map((r) => r.id.replace('CR-0', 'R')).join(' ')}</span></> : ''}
              </button>
            );
          }))}
        </div>
      </div>
      <div className="ml-7 mt-1 grid grid-cols-5 text-center text-[11px] text-ink-3">{[1, 2, 3, 4, 5].map((i) => <span key={i}>{i}</span>)}</div>
      <div className="ml-7 text-center text-[11px] text-ink-3">Impact →</div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
        {['Critical', 'High', 'Medium', 'Low'].map((r) => <SeverityBadge key={r} severity={r} />)}
        <span className="text-ink-3">Score = likelihood × impact (demo scale)</span>
      </div>
    </div>
  );
}
