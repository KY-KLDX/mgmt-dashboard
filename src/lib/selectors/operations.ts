import { AS_OF, daysBetween, daysFromAsOf } from '../../data/asOf';
import { ALLOCATIONS } from '../../data/allocations';
import { SUBSCRIPTIONS } from '../../data/investors';
import type { Thresholds } from '../../data/thresholds';
import type { Tranche } from '../../data/types';
import { allTrancheStats, trancheById, type TrancheStats } from './finance';

/** Investors holding an allocated subscription in the tranche. */
export const allocatedInvestors = (trancheId: string) =>
  [...new Set(SUBSCRIPTIONS.filter((s) => s.trancheId === trancheId && s.status === 'Allocated').map((s) => s.investorId))];

// ---- Subscription progress (operations view) ---------------------------------------------

export interface ProgressRow extends TrancheStats {
  section: 'Current' | 'Upcoming' | 'Recently closed';
  raised: number;
  /** Average raised per day since opening (live tranches only). */
  dailyPace: number | null;
  /** Straight-line estimate of the amount raised by close: raised + daily pace × days left (live tranches only). */
  projectedAtClose: number | null;
  /** Executive verdict for live tranches, from the estimate at close. */
  verdict: 'Filled' | 'On pace' | 'Close call' | 'At risk' | null;
}

function verdictFor(s: TrancheStats, raised: number, projected: number): NonNullable<ProgressRow['verdict']> {
  const target = s.tranche.target;
  if (raised >= target) return 'Filled';
  if (s.risk === 'Critical') return 'At risk';
  const share = projected / target;
  return share >= 1 ? 'On pace' : share >= 0.8 ? 'Close call' : 'At risk';
}

export function subscriptionProgress(th: Thresholds, closedLimit = 4): ProgressRow[] {
  const stats = allTrancheStats(th);
  const row = (s: TrancheStats, section: ProgressRow['section']): ProgressRow => {
    const raised = s.indicative || s.tranche.stage === 'Upcoming' ? s.pending : s.successful;
    const daysOpen = Math.max(1, daysBetween(s.tranche.openDate, AS_OF < s.tranche.closeDate ? AS_OF : s.tranche.closeDate));
    if (section !== 'Current') return { ...s, section, raised, dailyPace: null, projectedAtClose: null, verdict: null };
    const dailyPace = Math.round(raised / daysOpen);
    const projectedAtClose = raised + dailyPace * Math.max(0, daysFromAsOf(s.tranche.closeDate));
    return { ...s, section, raised, dailyPace, projectedAtClose, verdict: verdictFor(s, raised, projectedAtClose) };
  };
  const byClose = (a: TrancheStats, b: TrancheStats) => a.tranche.closeDate.localeCompare(b.tranche.closeDate);
  return [
    ...stats.filter((s) => s.tranche.stage === 'Open' || s.tranche.stage === 'Fully Subscribed').sort(byClose).map((s) => row(s, 'Current')),
    ...stats.filter((s) => s.tranche.stage === 'Upcoming').sort(byClose).map((s) => row(s, 'Upcoming')),
    ...stats.filter((s) => ['Closed', 'Issued / Settled'].includes(s.tranche.stage)).sort((a, b) => -byClose(a, b)).slice(0, closedLimit).map((s) => row(s, 'Recently closed')),
  ];
}

// ---- Allocation & minting tracker --------------------------------------------------------

export type StepState = 'done' | 'in progress' | 'blocked' | 'not started';

export interface AllocationRow {
  tranche: Tranche;
  investors: number;
  allocated: number;
  steps: { confirm: StepState; mint: StepState; allocate: StepState; release: StepState };
  confirmedOn: string | null;
  mintedOn: string | null;
  allocatedOn: string | null;
  releasedOn: string | null;
  releaseDue: string;
  blocker: string | null;
}

export function allocationTracker(): AllocationRow[] {
  return ALLOCATIONS.map((a) => {
    const tranche = trancheById(a.trancheId)!;
    const investors = allocatedInvestors(a.trancheId).length;
    const allocated = a.allocatedOn ? investors : a.mintedOn ? investors - a.allocatedPending : 0;
    // A step is blocked only when it cannot start; partial progress with a note stays 'in progress'.
    const blockedAt = a.blocker && !a.releasedOn && a.confirmedOn && !a.mintedOn ? 'mint' : null;
    const state = (done: boolean, started: boolean, key: string): StepState =>
      done ? 'done' : blockedAt === key ? 'blocked' : started ? 'in progress' : 'not started';
    return {
      tranche, investors, allocated,
      steps: {
        confirm: state(!!a.confirmedOn, true, 'confirm'),
        mint: state(!!a.mintedOn, !!a.confirmedOn, 'mint'),
        allocate: state(!!a.allocatedOn, !!a.mintedOn, 'allocate'),
        release: state(!!a.releasedOn, !!a.allocatedOn, 'release'),
      },
      confirmedOn: a.confirmedOn, mintedOn: a.mintedOn, allocatedOn: a.allocatedOn, releasedOn: a.releasedOn,
      releaseDue: tranche.issueDate,
      blocker: a.blocker,
    };
  });
}
