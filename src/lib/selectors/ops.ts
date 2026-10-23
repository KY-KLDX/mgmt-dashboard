import { AS_OF, daysFromAsOf } from '../../data/asOf';
import { OBLIGATIONS } from '../../data/obligations';
import { AVAILABILITY, CYBER_RISKS, CYBER_RISK_TREND, INCIDENTS } from '../../data/tech';
import { TRANCHES } from '../../data/tranches';
import type { CyberRisk, GovItem, GovStage, Incident, Obligation, ObligationType, RiskLevel } from '../../data/types';
import { isActiveStage, isLiveStage } from './finance';

// ---- Issuers & obligations -------------------------------------------------------------

export const obligationOpen = (o: Obligation) => o.status !== 'Completed';
export const obligationOverdue = (o: Obligation) => obligationOpen(o) && o.dueDate < AS_OF;

export interface TimelineEvent {
  id: string;
  date: string;
  type: ObligationType;
  title: string;
  issuerId: string;
  trancheId: string | null;
  risk: RiskLevel;
  status: string;
  obligationId: string | null;
}

/** Obligations plus scheduled tranche events not already tracked as obligations. */
export function timelineEvents(): TimelineEvent[] {
  const ev: TimelineEvent[] = OBLIGATIONS.filter(obligationOpen).map((o) => ({
    id: o.id, date: o.dueDate, type: o.type, title: o.title, issuerId: o.issuerId, trancheId: o.trancheId, risk: o.risk, status: o.status, obligationId: o.id,
  }));
  const has = (tid: string, type: ObligationType) => ev.some((e) => e.trancheId === tid && e.type === type);
  for (const t of TRANCHES) {
    const push = (date: string, type: ObligationType, label: string) => {
      if (date < AS_OF || has(t.id, type)) return;
      ev.push({ id: `${t.id}-${type}`, date, type, title: `${t.name} ${label}`, issuerId: t.issuerId, trancheId: t.id, risk: 'Low', status: 'Scheduled', obligationId: null });
    };
    if (t.stage === 'Upcoming') push(t.openDate, 'Tranche opening', 'opens');
    if (isLiveStage(t.stage)) push(t.closeDate, 'Tranche closing', 'closes');
    if (t.stage === 'Closed' || isLiveStage(t.stage)) push(t.issueDate, 'Issuance', 'issuance');
    if (t.stage === 'Issued / Settled') push(t.maturityDate, 'Principal repayment', 'matures (principal repayment)');
  }
  return ev.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function issuerKpis() {
  const open = OBLIGATIONS.filter(obligationOpen);
  const upcoming = timelineEvents().filter((e) => e.date >= AS_OF);
  const within30 = upcoming.filter((e) => daysFromAsOf(e.date) <= 30);
  const activeIssuerIds = new Set(TRANCHES.filter((t) => isActiveStage(t.stage) || t.stage === 'Upcoming').map((t) => t.issuerId));
  return {
    activeIssuers: activeIssuerIds.size,
    liveTranches: TRANCHES.filter((t) => isLiveStage(t.stage)).length,
    next: upcoming[0] ?? null,
    within30: within30.length,
    overdue: open.filter(obligationOverdue),
    applicationsPending: open.filter((o) => o.type === 'Application submission' || o.type === 'Regulatory submission'),
    highRisk: open.filter((o) => (o.risk === 'High' || o.risk === 'Critical') && daysFromAsOf(o.dueDate) <= 30),
  };
}

// ---- Technology & cyber ---------------------------------------------------------------

export const incidentOpen = (i: Incident) => i.status !== 'Resolved' && i.status !== 'Closed';
export const riskScore = (r: CyberRisk) => r.likelihood * r.impact;
export const ratingFromScore = (s: number): RiskLevel => (s >= 15 ? 'Critical' : s >= 10 ? 'High' : s >= 5 ? 'Medium' : 'Low');
export const riskRating = (r: CyberRisk) => ratingFromScore(riskScore(r));
export const riskOverdue = (r: CyberRisk) => !r.treatmentComplete && r.targetDate < AS_OF;

export function overdueCorrectiveActions() {
  const incidentActions = INCIDENTS.flatMap((i) => i.actions.filter((a) => !a.done && a.due < AS_OF).map((a) => ({ ...a, source: i.id, sourceTitle: i.title })));
  const riskActions = CYBER_RISKS.filter(riskOverdue).map((r) => ({ text: r.treatment, owner: r.owner, due: r.targetDate, done: false, source: r.id, sourceTitle: r.title }));
  return [...incidentActions, ...riskActions];
}

export function techKpis() {
  const open = INCIDENTS.filter(incidentOpen);
  const affected = new Set(open.filter((i) => i.status === 'Investigating' || i.status === 'Contained').map((i) => i.service));
  const elevated = CYBER_RISKS.filter((r) => ['High', 'Critical'].includes(riskRating(r)) && !r.treatmentComplete).length;
  return {
    critical: open.filter((i) => i.severity === 'Critical'),
    high: open.filter((i) => i.severity === 'High'),
    affected: [...affected],
    overdueActions: overdueCorrectiveActions(),
    belowTarget: AVAILABILITY.filter((a) => a.availability < a.target),
    riskTrend: [...CYBER_RISK_TREND, { month: AS_OF.slice(0, 7), open: elevated }],
    elevated,
  };
}

export const topRisks = () => [...CYBER_RISKS].sort((a, b) => riskScore(b) - riskScore(a) || Number(riskOverdue(b)) - Number(riskOverdue(a))).slice(0, 5);

// ---- Governance -----------------------------------------------------------------------

export const CLOSED_STAGES: GovStage[] = ['Approved', 'Endorsed', 'Noted', 'Rejected', 'Closed'];
export const govOpen = (g: GovItem) => !CLOSED_STAGES.includes(g.stage);
export const govOverdue = (g: GovItem) => govOpen(g) && g.targetDate < AS_OF;
export const govPrepMissed = (g: GovItem) => govOpen(g) && !govOverdue(g) && g.prepDeadline < AS_OF && g.readiness < 100;
/** Awaiting a decision: an approval, decision or endorsement that has reached the deciding body (Management Review onwards). */
export const govDecision = (g: GovItem) =>
  govOpen(g) && ['Approval', 'Decision', 'Endorsement'].includes(g.actionType) && ['Management Review', 'Ready for Submission', 'Submitted'].includes(g.stage);
export const isPolicy = (g: GovItem) => !!g.policy;
export const isApplication = (g: GovItem) => !!g.application;

export type DueState = 'Overdue' | 'Due soon' | 'On track' | 'Complete' | 'Not started';

export function govDueState(g: GovItem, soonDays = 14): DueState {
  if (!govOpen(g)) return 'Complete';
  if (govOverdue(g) || (g.blocker && g.priority === 'High' && daysFromAsOf(g.targetDate) <= soonDays)) return 'Overdue';
  if (daysFromAsOf(g.targetDate) <= soonDays || govPrepMissed(g) || govDecision(g)) return 'Due soon';
  if (g.stage === 'Drafting' && g.readiness < 20) return 'Not started';
  return 'On track';
}

export function govKpis(items: GovItem[]) {
  const open = items.filter(govOpen);
  return {
    decisions: open.filter(govDecision),
    overdue: open.filter(govOverdue),
    board30: open.filter((g) => g.body === 'Board' && daysFromAsOf(g.targetDate) >= 0 && daysFromAsOf(g.targetDate) <= 30),
    policiesDue: items.filter((g) => isPolicy(g) && govOpen(g) && daysFromAsOf(g.policy!.nextReview) <= 60),
    applications: open.filter(isApplication),
    blocked: open.filter((g) => g.blocker && g.priority === 'High'),
  };
}
