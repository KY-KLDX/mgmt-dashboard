import { Check, ExternalLink, Link2, MessageSquarePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { daysFromAsOf } from '../../data/asOf';
import { GOV_OUTCOMES, GOV_WORKFLOW, type GovItem, type GovStage } from '../../data/types';
import { date, dateTime, relDays } from '../../lib/format';
import { CLOSED_STAGES, govDueState, govOverdue } from '../../lib/selectors/ops';
import { useApp } from '../../state/AppState';
import { StatusBadge, toneFor } from '../ui/Badge';
import { Drawer, DrawerSection } from '../ui/Drawer';
import { Button, Field, Modal, Progress } from '../ui/Primitives';

export const OWNERS = [
  'CEO', 'Head of Finance', 'Head of Compliance', 'Head of Risk', 'Head of Legal', 'Chief Technology Officer', 'Head of Information Security',
  'Head of Investor Operations', 'Head of Issuer Origination', 'Head of Marketing', 'Company Secretary',
];

const ALL_STAGES: GovStage[] = ['Drafting', 'Internal Review', 'Management Review', 'Ready for Submission', 'Submitted', ...GOV_OUTCOMES, 'Closed'];
const SENSITIVE: GovStage[] = ['Approved', 'Endorsed', 'Rejected', 'Closed'];

function Workflow({ g }: { g: GovItem }) {
  const isOutcome = GOV_OUTCOMES.includes(g.stage);
  const idx = isOutcome ? 5 : GOV_WORKFLOW.indexOf(g.stage);
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Workflow stage">
      {GOV_WORKFLOW.map((st, k) => {
        const label = k === 5 ? (isOutcome ? g.stage : 'Outcome') : st;
        const skipped = g.skips.includes(st);
        const done = k < idx || (k === idx && g.stage === 'Closed');
        const cur = k === idx && g.stage !== 'Closed';
        return (
          <li key={st} className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium ${
            skipped ? 'border border-dashed border-line text-ink-3 line-through decoration-ink-3/60' : cur ? 'bg-rail text-white' : done ? 'bg-good-soft text-good' : 'bg-sunken text-ink-3'}`}
            aria-current={cur ? 'step' : undefined} title={skipped ? 'Not required for this item' : undefined}>
            {done && !skipped && <Check size={11} aria-hidden />}
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function GovernanceDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { governance, dispatch, toast, actor } = useApp();
  const g = governance.find((x) => x.id === id);
  const [comment, setComment] = useState('');
  const [nextAction, setNextAction] = useState(g?.nextAction ?? '');
  const [link, setLink] = useState('');
  const [pending, setPending] = useState<GovStage | null>(null);
  useEffect(() => { setNextAction(g?.nextAction ?? ''); setComment(''); setLink(''); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;

  const update = (patch: Partial<GovItem>, log: string, msg: string) => {
    dispatch({ type: 'gov', id: g.id, patch, log, by: actor });
    toast(`${msg} (demo update, not saved to any system)`);
  };
  const applyStage = (st: GovStage) => {
    const closing = CLOSED_STAGES.includes(st);
    update({ stage: st, completedOn: closing ? '2026-10-23' : null, readiness: closing ? 100 : g.readiness }, `Status changed from ${g.stage} to ${st}.`, `Status set to ${st}`);
  };
  const onStage = (st: GovStage) => (SENSITIVE.includes(st) ? setPending(st) : applyStage(st));
  const due = govDueState(g);
  const d = daysFromAsOf(g.targetDate);

  return (
    <Drawer open onClose={onClose} title={g.title} eyebrow={`${g.category} · ${g.id}`} width="max-w-[720px]"
      headerExtra={<>
        <StatusBadge status={g.stage} />
        <StatusBadge status={due} tone={toneFor(due)} />
        <StatusBadge status={`${g.priority} priority`} tone={g.priority === 'High' ? 'warn' : 'mute'} />
        {g.blocker && <StatusBadge status="Blocked" tone="crit" />}
      </>}>
      <DrawerSection title="Requirement">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Required governance body">{g.body}</Field>
          <Field label="Required action">{g.actionType}</Field>
          <Field label="Accountable owner">{g.owner}</Field>
          <Field label="Supporting department">{g.supportingDept}</Field>
          <Field label="Target meeting / submission"><span className="num">{date(g.targetDate)}</span><br /><span className={`text-[12px] ${govOverdue(g) ? 'text-crit' : 'text-ink-3'}`}>{CLOSED_STAGES.includes(g.stage) ? `Completed ${date(g.completedOn)}` : relDays(d)}</span></Field>
          <Field label="Internal preparation deadline"><span className="num">{date(g.prepDeadline)}</span></Field>
          {g.boardMeeting && <Field label="Board meeting / circulation">{g.boardMeeting}</Field>}
        </dl>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[12px] text-ink-3"><span>Readiness</span><span className="num">{g.readiness}%</span></div>
          <Progress value={g.readiness / 100} tone={g.readiness >= 80 ? 'good' : g.readiness >= 50 ? 'accent' : 'warn'} label="Readiness" />
        </div>
      </DrawerSection>

      <DrawerSection title="Workflow"><Workflow g={g} />
        {g.skips.length > 0 && <p className="mt-2 text-[12px] text-ink-3">Stages struck through are not required for this item.</p>}
      </DrawerSection>

      <DrawerSection title="Status, blocker and next action">
        <dl className="grid grid-cols-1 gap-3">
          <Field label="Latest update">{g.latestUpdate}</Field>
          {g.blocker && <Field label="Blocker"><span className="text-crit">{g.blocker}</span></Field>}
          {g.dependencies.length > 0 && <Field label="Dependencies">{g.dependencies.join(' · ')}</Field>}
          {g.policy && <Field label="Policy">Version {g.policy.version} · last reviewed {date(g.policy.lastReview)} · next review {date(g.policy.nextReview)}<br /><span className="text-ink-3">{g.policy.proposedChanges} · {g.policy.requirementRef}</span></Field>}
          {g.application && <Field label="Application">{g.application.applicationType} to {g.application.authority} · approval required: {g.application.approvalRequired}<br /><span className="text-ink-3">Missing information: {g.application.missingInfo ?? 'None'}</span></Field>}
        </dl>
      </DrawerSection>

      <DrawerSection title="Update this item (demo)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label htmlFor="g-stage" className="flex flex-col gap-1 text-[12px] text-ink-3">Workflow stage
            <select id="g-stage" value={g.stage} onChange={(e) => onStage(e.target.value as GovStage)} className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink">
              {ALL_STAGES.map((s) => <option key={s} value={s} disabled={g.skips.includes(s)}>{s}{g.skips.includes(s) ? ' (not required)' : ''}</option>)}
            </select>
          </label>
          <label htmlFor="g-owner" className="flex flex-col gap-1 text-[12px] text-ink-3">Accountable owner
            <select id="g-owner" value={g.owner} onChange={(e) => update({ owner: e.target.value }, `Owner changed from ${g.owner} to ${e.target.value}.`, `Owner updated to ${e.target.value}`)}
              className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink">
              {OWNERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label htmlFor="g-date" className="flex flex-col gap-1 text-[12px] text-ink-3">Target date
            <input id="g-date" type="date" value={g.targetDate} onChange={(e) => e.target.value && update({ targetDate: e.target.value }, `Target date changed from ${date(g.targetDate)} to ${date(e.target.value)}.`, `Target date set to ${date(e.target.value)}`)}
              className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink" />
          </label>
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nextAction.trim() && nextAction !== g.nextAction) update({ nextAction: nextAction.trim() }, `Next action recorded: ${nextAction.trim()}`, 'Next action recorded'); }}>
          <label htmlFor="g-next" className="sr-only">Next required action</label>
          <input id="g-next" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Next required action" className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px]" />
          <Button type="submit">Save next action</Button>
        </form>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) { update({ latestUpdate: comment.trim() }, `Comment: ${comment.trim()}`, 'Comment added'); setComment(''); } }}>
          <label htmlFor="g-comment" className="sr-only">Add a comment</label>
          <input id="g-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (becomes the latest update)" className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px]" />
          <Button type="submit" icon={<MessageSquarePlus size={14} aria-hidden />}>Add</Button>
        </form>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const l = link.trim() || `demo://documents/${g.id.toLowerCase()}-${g.activity.length + 1}`; update({ documentLink: l }, `Supporting document linked: ${l}`, 'Mock document linked'); setLink(''); }}>
          <label htmlFor="g-link" className="sr-only">Mock supporting-document link</label>
          <input id="g-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder={g.documentLink ?? 'demo://documents/… (leave blank to generate)'} className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-[12px]" />
          <Button type="submit" icon={<Link2 size={14} aria-hidden />}>Link document</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={!['Drafting', 'Internal Review'].includes(g.stage)}
            onClick={() => update({ stage: 'Management Review', readiness: Math.max(g.readiness, 80) }, 'Marked ready for management review.', 'Marked ready for review')}>
            Mark ready for review
          </Button>
          {g.documentLink && <span className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-3"><ExternalLink size={12} aria-hidden />{g.documentLink}</span>}
        </div>
      </DrawerSection>

      <DrawerSection title={`Activity history (${g.activity.length})`}>
        {g.activity.length ? (
          <ol className="relative space-y-3 border-l border-line pl-4">
            {g.activity.map((a, k) => (
              <li key={k} className="text-[13px]">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" aria-hidden />
                <div className="num text-[11.5px] text-ink-3">{dateTime(a.at)} · {a.by}</div>
                <div>{a.text}</div>
              </li>
            ))}
          </ol>
        ) : <p className="text-[13px] text-ink-3">No activity recorded yet.</p>}
      </DrawerSection>

      <Modal open={pending !== null} onClose={() => setPending(null)} title="Confirm status change"
        footer={<><Button onClick={() => setPending(null)}>Cancel</Button><Button variant={pending === 'Rejected' ? 'danger' : 'primary'} onClick={() => { if (pending) applyStage(pending); setPending(null); }}>Set to {pending}</Button></>}>
        <p className="text-[13.5px]">Change <span className="font-semibold">{g.title}</span> from <span className="font-medium">{g.stage}</span> to <span className="font-medium">{pending}</span>?</p>
        <p className="mt-2 text-[12.5px] text-ink-3">{pending && CLOSED_STAGES.includes(pending) ? 'The item will leave open counts and alerts, including the Critical Items count on the Executive Overview.' : ''} This is a demo change held in the browser only.</p>
      </Modal>
    </Drawer>
  );
}
