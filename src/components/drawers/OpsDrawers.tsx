import { CheckCircle2, Circle, FileText, Paperclip } from 'lucide-react';
import { AS_OF, daysFromAsOf } from '../../data/asOf';
import { ISSUERS } from '../../data/issuers';
import { OBLIGATIONS } from '../../data/obligations';
import { CYBER_RISKS, INCIDENTS } from '../../data/tech';
import { TRANCHES } from '../../data/tranches';
import { date, dateTime, relDays, rm } from '../../lib/format';
import { trancheStats } from '../../lib/selectors/finance';
import { obligationOpen, obligationOverdue, riskOverdue, riskRating, riskScore } from '../../lib/selectors/ops';
import { useApp } from '../../state/AppState';
import { SeverityBadge, StatusBadge } from '../ui/Badge';
import { Drawer, DrawerSection } from '../ui/Drawer';
import { Field, Progress } from '../ui/Primitives';

export function IssuerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { thresholds, openDrawer } = useApp();
  const iss = ISSUERS.find((i) => i.id === id);
  if (!iss) return null;
  const tranches = TRANCHES.filter((t) => t.issuerId === id);
  const obligations = OBLIGATIONS.filter((o) => o.issuerId === id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const open = obligations.filter(obligationOpen);
  const overdue = open.filter(obligationOverdue);
  const next = open.find((o) => o.dueDate >= AS_OF);
  const owners = [...new Set([iss.relationshipOwner, ...obligations.map((o) => o.owner)])];
  const activity = [
    ...iss.updates.map((u) => ({ d: u.date, text: u.text, by: u.by })),
    ...tranches.flatMap((t) => [
      ...(t.closeDate <= AS_OF ? [{ d: t.closeDate, text: `${t.name} closed`, by: 'System' }] : []),
      ...(t.openDate <= AS_OF ? [{ d: t.openDate, text: `${t.name} opened`, by: 'System' }] : []),
    ]),
    { d: iss.onboardedOn, text: 'Issuer onboarded', by: 'System' },
  ].sort((a, b) => b.d.localeCompare(a.d));

  return (
    <Drawer open onClose={onClose} title={iss.name} eyebrow={`Issuer · ${iss.id} · ${iss.sector}`}
      headerExtra={<><StatusBadge status={iss.status} tone={iss.status === 'Active' ? 'good' : 'mute'} />{overdue.length > 0 && <StatusBadge status={`${overdue.length} overdue`} tone="crit" />}</>}>
      <DrawerSection title="Summary">
        <p className="text-[13px] text-ink-2">{iss.summary}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Relationship owner">{iss.relationshipOwner}</Field>
          <Field label="Onboarded">{date(iss.onboardedOn)}</Field>
          <Field label="Next event">{next ? <>{next.title}<br /><span className="num text-ink-3">{date(next.dueDate)} · {relDays(daysFromAsOf(next.dueDate))}</span></> : 'None scheduled'}</Field>
        </dl>
      </DrawerSection>

      <DrawerSection title={`Tranches (${tranches.length})`}>
        {tranches.length ? (
          <ul className="space-y-2">
            {tranches.map((t) => {
              const s = trancheStats(t, thresholds);
              return (
                <li key={t.id}>
                  <button onClick={() => openDrawer({ kind: 'tranche', id: t.id })} className="flex w-full items-center gap-3 rounded-lg border border-line p-2.5 text-left text-[13px] hover:bg-sunken">
                    <span className="flex-1"><span className="font-medium">{t.name}</span><span className="block text-[12px] text-ink-3">{t.id} · target {rm(t.target)}</span></span>
                    <span className="num w-16 text-right text-[12px] text-ink-2">{Math.round(s.fulfilment * 100)}%</span>
                    <StatusBadge status={t.stage} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-[13px] text-ink-3">No tranches issued yet.</p>}
      </DrawerSection>

      <DrawerSection title={`Obligations (${open.length} open)`}>
        <ul className="space-y-2">
          {obligations.map((o) => (
            <li key={o.id} className={`rounded-lg border p-2.5 text-[13px] ${obligationOverdue(o) ? 'border-crit/40 bg-crit-soft/40' : 'border-line'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{o.title}</div>
                  <div className="text-[12px] text-ink-3">{o.type} · {o.owner} · due {date(o.dueDate)} · {o.status === 'Completed' ? 'completed' : relDays(daysFromAsOf(o.dueDate))}</div>
                  <div className="mt-1 text-[12.5px] text-ink-2">Next: {o.nextAction}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1"><StatusBadge status={obligationOverdue(o) ? 'Overdue' : o.status} /><SeverityBadge severity={o.risk} /></div>
              </div>
            </li>
          ))}
        </ul>
      </DrawerSection>

      <DrawerSection title="Documents and evidence">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {['Issuer due diligence pack', 'Latest management accounts', 'Facility / note agreement', 'Board resolution (CP)'].map((d, k) => (
            <li key={d} className="flex items-center gap-2 rounded-lg border border-dashed border-line p-2.5 text-[12.5px] text-ink-2">
              <FileText size={15} className="text-ink-3" aria-hidden /> {d}
              <span className="ml-auto text-[11px] text-ink-3">{k === 1 && overdue.length ? 'Missing' : 'Placeholder'}</span>
            </li>
          ))}
        </ul>
      </DrawerSection>

      <DrawerSection title="Assigned owners">
        <div className="flex flex-wrap gap-2">{owners.map((o) => <span key={o} className="rounded-full bg-sunken px-2.5 py-1 text-[12px]">{o}</span>)}</div>
      </DrawerSection>

      <DrawerSection title="Recent updates and activity">
        <ol className="relative space-y-3 border-l border-line pl-4">
          {activity.map((a, k) => (
            <li key={k} className="text-[13px]">
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" aria-hidden />
              <div className="num text-[11.5px] text-ink-3">{date(a.d)} · {a.by}</div>
              <div>{a.text}</div>
            </li>
          ))}
        </ol>
      </DrawerSection>
    </Drawer>
  );
}

export function IncidentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const i = INCIDENTS.find((x) => x.id === id);
  if (!i) return null;
  return (
    <Drawer open onClose={onClose} title={i.title} eyebrow={`Incident · ${i.id} · ${i.category}`}
      headerExtra={<><SeverityBadge severity={i.severity} /><StatusBadge status={i.status} /><span className="text-[12px] text-ink-3">Detected {dateTime(i.detectedAt)}</span></>}>
      <DrawerSection title="Executive summary">
        <p className="text-[13.5px] leading-relaxed">{i.summary}</p>
        {i.decisionRequired && (
          <div className="mt-3 rounded-lg border border-warn/40 bg-warn-soft p-3 text-[13px]">
            <div className="eyebrow mb-1 text-warn">Outstanding decision</div>
            {i.decisionRequired}
          </div>
        )}
      </DrawerSection>
      <DrawerSection title="Business and investor impact">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Business service affected">{i.service}</Field>
          <Field label="Accountable owner">{i.owner}</Field>
          <Field label="Business impact">{i.businessImpact}</Field>
          <Field label="Customer / investor impact">{i.investorImpact}</Field>
          <Field label="Systems affected">{i.systems.join(', ')}</Field>
          <Field label="Regulatory assessment (synthetic)">{i.regulatoryAssessment}</Field>
        </dl>
      </DrawerSection>
      <DrawerSection title="Containment and resolution">
        <p className="mb-2 text-[13px]">{i.containment}</p>
        <div className="mb-1 flex justify-between text-[12px] text-ink-3"><span>Resolution progress</span><span className="num">{i.progress}% · target {date(i.targetResolution)}</span></div>
        <Progress value={i.progress / 100} tone={i.progress === 100 ? 'good' : 'accent'} label="Resolution progress" />
        <div className="mt-3 text-[12.5px] text-ink-2">Post-incident review: <StatusBadge status={i.pirStatus} /></div>
      </DrawerSection>
      <DrawerSection title="Actions">
        <ul className="space-y-2">
          {i.actions.map((a) => {
            const late = !a.done && a.due < AS_OF;
            return (
              <li key={a.text} className="flex items-start gap-2.5 text-[13px]">
                {a.done ? <CheckCircle2 size={16} className="mt-0.5 text-good" aria-hidden /> : <Circle size={16} className={`mt-0.5 ${late ? 'text-crit' : 'text-ink-3'}`} aria-hidden />}
                <span className="flex-1">{a.text}<span className="block text-[12px] text-ink-3">{a.owner} · due {date(a.due)}</span></span>
                {late && <StatusBadge status="Overdue" />}
              </li>
            );
          })}
        </ul>
      </DrawerSection>
      <DrawerSection title="Timeline">
        <ol className="relative space-y-3 border-l border-line pl-4">
          {i.timeline.map((t) => (
            <li key={t.at} className="text-[13px]">
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" aria-hidden />
              <div className="num text-[11.5px] text-ink-3">{dateTime(t.at)}</div>
              <div>{t.text}</div>
            </li>
          ))}
        </ol>
      </DrawerSection>
    </Drawer>
  );
}

export function RiskDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const r = CYBER_RISKS.find((x) => x.id === id);
  if (!r) return null;
  const rating = riskRating(r);
  return (
    <Drawer open onClose={onClose} title={r.title} eyebrow={`Cyber risk · ${r.id}`} width="max-w-[560px]"
      headerExtra={<><SeverityBadge severity={rating} /><StatusBadge status={r.trend} tone={r.trend === 'Worsening' ? 'crit' : r.trend === 'Improving' ? 'good' : 'mute'} />{riskOverdue(r) && <StatusBadge status="Treatment overdue" tone="crit" />}</>}>
      <DrawerSection title="Risk">
        <p className="text-[13.5px]">{r.description}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Business area">{r.area}</Field>
          <Field label="Likelihood × impact"><span className="num">{r.likelihood} × {r.impact} = {riskScore(r)}</span></Field>
          <Field label="Residual risk">{r.residual}</Field>
          <Field label="Accountable owner">{r.owner}</Field>
          <Field label="Target date">{date(r.targetDate)}</Field>
          <Field label="Treatment status">{r.treatmentComplete ? 'Complete' : riskOverdue(r) ? `Overdue (${-daysFromAsOf(r.targetDate)} days)` : 'In progress'}</Field>
        </dl>
      </DrawerSection>
      <DrawerSection title="Existing controls"><p className="text-[13px]">{r.controls}</p></DrawerSection>
      <DrawerSection title="Current treatment"><p className="text-[13px]">{r.treatment}</p></DrawerSection>
      <p className="text-center text-[11.5px] text-ink-3"><Paperclip size={11} className="inline" aria-hidden /> Synthetic risk record. Demo scoring scale, not KLDX methodology.</p>
    </Drawer>
  );
}
