import { CheckCircle2, Circle, FileText } from 'lucide-react';
import { AS_OF, daysFromAsOf } from '../../data/asOf';
import { ISSUERS } from '../../data/issuers';
import { OBLIGATIONS } from '../../data/obligations';
import { CYBER_RISKS, INCIDENTS } from '../../data/tech';
import { TRANCHES } from '../../data/tranches';
import { date, dateTime, relDays } from '../../lib/format';
import { trancheStats } from '../../lib/selectors/finance';
import { obligationOpen, obligationOverdue, riskOverdue, riskRating, riskScore } from '../../lib/selectors/ops';
import { useApp } from '../../state/AppState';
import { SeverityBadge, StatusBadge } from '../ui/Badge';
import { Drawer, DrawerSection, NeedsLine } from '../ui/Drawer';
import { Field, Progress } from '../ui/Primitives';

function Activity({ items }: { items: { at: string; text: string; by?: string }[] }) {
  return (
    <ol className="relative space-y-3 border-l border-line pl-4">
      {items.map((a, k) => (
        <li key={k} className="text-[13px]">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" aria-hidden />
          <div className="num text-[11.5px] text-ink-3">{a.at.length > 10 ? dateTime(a.at) : date(a.at)}{a.by ? ` · ${a.by}` : ''}</div>
          <div>{a.text}</div>
        </li>
      ))}
    </ol>
  );
}

export function IssuerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { thresholds, openDrawer } = useApp();
  const iss = ISSUERS.find((i) => i.id === id);
  if (!iss) return null;
  const tranches = TRANCHES.filter((t) => t.issuerId === id);
  const obligations = OBLIGATIONS.filter((o) => o.issuerId === id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const open = obligations.filter(obligationOpen);
  const overdue = open.filter(obligationOverdue);
  const next = open.find((o) => o.dueDate >= AS_OF);
  const activity = [
    ...iss.updates.map((u) => ({ at: u.date, text: u.text, by: u.by })),
    ...tranches.filter((t) => t.closeDate <= AS_OF).map((t) => ({ at: t.closeDate, text: `${t.name} closed` })),
    { at: iss.onboardedOn, text: 'Issuer onboarded' },
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Drawer open onClose={onClose} title={iss.name} eyebrow={iss.sector}
      headerExtra={<><StatusBadge status={iss.status} tone={iss.status === 'Active' ? 'good' : 'mute'} />{overdue.length > 0 && <StatusBadge status={`${overdue.length} overdue`} tone="crit" />}</>}>
      {overdue[0] ? <NeedsLine label="Overdue" text={`${overdue[0].title}. ${overdue[0].nextAction}`} tone="crit" />
        : next && <NeedsLine label="Next" text={`${next.title}, ${date(next.dueDate)} (${relDays(daysFromAsOf(next.dueDate))})`} tone="mute" />}

      <DrawerSection title="Key facts">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Tranches">{tranches.length} ({tranches.filter((t) => t.stage !== 'Matured').length} current)</Field>
          <Field label="Open obligations">{open.length}</Field>
          <Field label="Relationship owner">{iss.relationshipOwner}</Field>
          <Field label="Onboarded">{date(iss.onboardedOn)}</Field>
        </dl>
      </DrawerSection>

      {tranches.length > 0 && (
        <DrawerSection folded title={`Tranches (${tranches.length})`}>
          <ul className="space-y-1.5">
            {tranches.map((t) => (
              <li key={t.id}>
                <button onClick={() => openDrawer({ kind: 'tranche', id: t.id })} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-sunken">
                  <span className="flex-1 font-medium">{t.name}</span>
                  <span className="num text-[12px] text-ink-2">{Math.round(trancheStats(t, thresholds).fulfilment * 100)}%</span>
                  <StatusBadge status={t.stage} />
                </button>
              </li>
            ))}
          </ul>
        </DrawerSection>
      )}

      <DrawerSection folded title={`Obligations (${obligations.length})`}>
        <ul className="space-y-2.5">
          {obligations.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-3 text-[13px]">
              <span className="min-w-0">{o.title}<span className="num block text-[12px] text-ink-3">{date(o.dueDate)} · {o.owner}</span></span>
              <StatusBadge status={obligationOverdue(o) ? 'Overdue' : o.status} />
            </li>
          ))}
        </ul>
      </DrawerSection>

      <DrawerSection folded title="Documents">
        <ul className="space-y-1.5 text-[13px] text-ink-2">
          {['Due diligence pack', 'Latest management accounts', 'Note agreement', 'Board resolution (CP)'].map((d, k) => (
            <li key={d} className="flex items-center gap-2"><FileText size={14} className="text-ink-3" aria-hidden />{d}<span className="ml-auto text-[11.5px] text-ink-3">{k === 1 && overdue.length ? 'Missing' : 'Placeholder'}</span></li>
          ))}
        </ul>
      </DrawerSection>

      <DrawerSection folded title="Updates and activity">
        <p className="mb-3 text-[13px] text-ink-2">{iss.summary}</p>
        <Activity items={activity} />
      </DrawerSection>
    </Drawer>
  );
}

export function IncidentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const i = INCIDENTS.find((x) => x.id === id);
  if (!i) return null;
  return (
    <Drawer open onClose={onClose} title={i.title} eyebrow={`${i.id} · ${i.category}`}
      headerExtra={<><SeverityBadge severity={i.severity} /><StatusBadge status={i.status} /></>}>
      {i.decisionRequired && <NeedsLine label="Decision" text={i.decisionRequired} tone="warn" />}

      <DrawerSection title="Key facts">
        <p className="mb-4 text-[13.5px]">{i.businessImpact}</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Service">{i.service}</Field>
          <Field label="Owner">{i.owner}</Field>
          <Field label="Detected">{dateTime(i.detectedAt)}</Field>
          <Field label="Target resolution">{date(i.targetResolution)}</Field>
        </dl>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[12px] text-ink-3"><span>Resolution</span><span className="num">{i.progress}%</span></div>
          <Progress value={i.progress / 100} tone={i.progress === 100 ? 'good' : 'accent'} label="Resolution progress" />
        </div>
      </DrawerSection>

      <DrawerSection folded title="Detail">
        <dl className="grid grid-cols-1 gap-3">
          <Field label="Summary">{i.summary}</Field>
          <Field label="Investor impact">{i.investorImpact}</Field>
          <Field label="Containment">{i.containment}</Field>
          <Field label="Systems">{i.systems.join(', ')}</Field>
          <Field label="Regulatory assessment (synthetic)">{i.regulatoryAssessment}</Field>
          <Field label="Post-incident review">{i.pirStatus}</Field>
        </dl>
      </DrawerSection>

      <DrawerSection folded title={`Actions (${i.actions.filter((a) => !a.done).length} open)`}>
        <ul className="space-y-2">
          {i.actions.map((a) => {
            const late = !a.done && a.due < AS_OF;
            return (
              <li key={a.text} className="flex items-start gap-2.5 text-[13px]">
                {a.done ? <CheckCircle2 size={16} className="mt-0.5 text-good" aria-hidden /> : <Circle size={16} className={`mt-0.5 ${late ? 'text-crit' : 'text-ink-3'}`} aria-hidden />}
                <span className="flex-1">{a.text}<span className="block text-[12px] text-ink-3">{a.owner} · {date(a.due)}</span></span>
                {late && <StatusBadge status="Overdue" />}
              </li>
            );
          })}
        </ul>
      </DrawerSection>

      <DrawerSection folded title="Timeline"><Activity items={i.timeline.map((t) => ({ at: t.at, text: t.text }))} /></DrawerSection>
    </Drawer>
  );
}

export function RiskDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const r = CYBER_RISKS.find((x) => x.id === id);
  if (!r) return null;
  return (
    <Drawer open onClose={onClose} title={r.title} eyebrow={`${r.id} · cyber risk`} width="max-w-[560px]"
      headerExtra={<><SeverityBadge severity={riskRating(r)} /><StatusBadge status={r.trend} tone={r.trend === 'Worsening' ? 'crit' : r.trend === 'Improving' ? 'good' : 'mute'} /></>}>
      {riskOverdue(r) && <NeedsLine label="Overdue" text={`${r.treatment} (${-daysFromAsOf(r.targetDate)} days late)`} tone="crit" />}
      <DrawerSection title="Key facts">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Business area">{r.area}</Field>
          <Field label="Likelihood × impact"><span className="num">{r.likelihood} × {r.impact} = {riskScore(r)}</span></Field>
          <Field label="Owner">{r.owner}</Field>
          <Field label="Target date">{date(r.targetDate)}{r.treatmentComplete ? ' · complete' : ''}</Field>
        </dl>
      </DrawerSection>
      <DrawerSection folded title="Detail">
        <dl className="grid grid-cols-1 gap-3">
          <Field label="Description">{r.description}</Field>
          <Field label="Existing controls">{r.controls}</Field>
          <Field label="Treatment">{r.treatment}</Field>
          <Field label="Residual risk">{r.residual}</Field>
        </dl>
      </DrawerSection>
    </Drawer>
  );
}
