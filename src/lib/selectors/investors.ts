import { AS_OF, daysBetween } from '../../data/asOf';
import { INVESTORS, SUBSCRIPTIONS, TRANSACTIONS } from '../../data/investors';
import { TRANCHES } from '../../data/tranches';
import type { Bands } from '../../data/thresholds';
import type { Investor, Subscription, Transaction } from '../../data/types';
import { inRange, type Range } from '../period';

const trancheMap = new Map(TRANCHES.map((t) => [t.id, t]));

/** A subscription is current at a date when it was allocated at a close on/before that date and has not matured. */
export function isCurrentAt(s: Subscription, at: string): boolean {
  if (s.status !== 'Allocated') return false;
  const t = trancheMap.get(s.trancheId)!;
  return t.closeDate <= at && t.maturityDate > at;
}

export interface InvestorMetrics {
  inv: Investor;
  current: number;
  currentCount: number;
  lifetimeAllocated: number;
  pending: number;
  deposits: number;
  withdrawals: number;
  withdrawalCount: number;
  maturityReturns: number;
  failedTopUps: number;
  failedTopUpAmount: number;
  wallet: number;
  lastSubscription: string | null;
  subs: Subscription[];
  txns: Transaction[];
}

const metricsCache = new Map<string, InvestorMetrics>();

export function investorMetrics(inv: Investor, at = AS_OF): InvestorMetrics {
  const key = `${inv.id}|${at}`;
  const hit = metricsCache.get(key);
  if (hit) return hit;
  const subs = SUBSCRIPTIONS.filter((s) => s.investorId === inv.id && s.requestedOn <= at);
  const txns = TRANSACTIONS.filter((t) => t.investorId === inv.id && t.date <= at);
  const allocated = subs.filter((s) => s.status === 'Allocated' && trancheMap.get(s.trancheId)!.closeDate <= at);
  const current = allocated.filter((s) => isCurrentAt(s, at));
  const pending = subs.filter((s) => s.status === 'Pending' || (s.status === 'Allocated' && trancheMap.get(s.trancheId)!.closeDate > at));
  const sumT = (f: (t: Transaction) => boolean) => txns.filter(f).reduce((a, t) => a + t.amount, 0);
  const deposits = sumT((t) => t.type === 'Top-up' && t.status === 'Successful');
  const withdrawalsList = txns.filter((t) => t.type === 'Withdrawal' && t.status === 'Completed');
  const withdrawals = withdrawalsList.reduce((a, t) => a + t.amount, 0);
  const maturityReturns = sumT((t) => t.type === 'Maturity return');
  const failed = txns.filter((t) => t.type === 'Top-up' && t.status === 'Failed');
  const lifetimeAllocated = allocated.reduce((a, s) => a + s.amount, 0);
  const pendingAmt = pending.reduce((a, s) => a + s.amount, 0);
  const m: InvestorMetrics = {
    inv,
    current: current.reduce((a, s) => a + s.amount, 0),
    currentCount: current.length,
    lifetimeAllocated,
    pending: pendingAmt,
    deposits,
    withdrawals,
    withdrawalCount: withdrawalsList.length,
    maturityReturns,
    failedTopUps: failed.length,
    failedTopUpAmount: failed.reduce((a, t) => a + t.amount, 0),
    wallet: deposits + maturityReturns - lifetimeAllocated - pendingAmt - withdrawals,
    lastSubscription: subs.filter((s) => s.status === 'Allocated' || s.status === 'Pending').reduce<string | null>((a, s) => (!a || s.requestedOn > a ? s.requestedOn : a), null),
    subs: SUBSCRIPTIONS.filter((s) => s.investorId === inv.id),
    txns: TRANSACTIONS.filter((t) => t.investorId === inv.id),
  };
  metricsCache.set(key, m);
  return m;
}

export const allInvestorMetrics = (at = AS_OF) => INVESTORS.map((i) => investorMetrics(i, at));
export const activeInvestors = (at = AS_OF) => allInvestorMetrics(at).filter((m) => m.currentCount > 0);

export const isCtosIncomplete = (i: Investor, at = AS_OF) => !!i.onboardingStartedOn && i.onboardingStartedOn <= at && !(i.ctosCompletedOn && i.ctosCompletedOn <= at);
export const isKycIncomplete = (i: Investor, at = AS_OF) => !!i.ctosCompletedOn && i.ctosCompletedOn <= at && !(i.kycCompletedOn && i.kycCompletedOn <= at);
export const isOnboarded = (i: Investor, at = AS_OF) => !!i.approvedOn && i.approvedOn <= at;
export const onboardingAge = (i: Investor) => daysBetween(i.registeredOn, AS_OF);

// ---- Funnel -----------------------------------------------------------------------------

export const FUNNEL_STAGES = [
  'Registered',
  'Onboarding Started',
  'CTOS Completed',
  'KYC Completed',
  'Account Approved',
  'Funds Deposited',
  'Current Subscription',
] as const;

function firstDepositOn(i: Investor): string | null {
  const t = TRANSACTIONS.find((x) => x.investorId === i.id && x.type === 'Top-up' && x.status === 'Successful');
  return t?.date ?? null;
}

function firstCurrentOn(i: Investor): string | null {
  const dates = SUBSCRIPTIONS.filter((s) => s.investorId === i.id && isCurrentAt(s, AS_OF)).map((s) => trancheMap.get(s.trancheId)!.closeDate);
  return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
}

const stageDates = (i: Investor): (string | null)[] => [
  i.registeredOn,
  i.onboardingStartedOn,
  i.ctosCompletedOn,
  i.kycCompletedOn,
  i.approvedOn,
  firstDepositOn(i),
  firstCurrentOn(i),
];

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface FunnelStage {
  stage: (typeof FUNNEL_STAGES)[number];
  count: number;
  fromPrev: number | null;
  fromStart: number;
  dropOff: number;
  /** Median days spent at this stage before reaching the next one. */
  medianDays: number | null;
  ids: string[];
}

/** Funnel for the cohort of investors registered within the range (or all, when range is null). Status as at the reporting date. */
export function funnel(r: Range | null): FunnelStage[] {
  const cohort = INVESTORS.filter((i) => !r || inRange(i.registeredOn, r));
  const dates = cohort.map((i) => ({ i, d: stageDates(i) }));
  const counts = FUNNEL_STAGES.map((_, k) => dates.filter((x) => x.d[k] !== null).map((x) => x.i.id));
  return FUNNEL_STAGES.map((stage, k) => {
    const count = counts[k].length;
    const next = counts[k + 1]?.length;
    const durations = k < FUNNEL_STAGES.length - 1 ? dates.filter((x) => x.d[k] && x.d[k + 1]).map((x) => daysBetween(x.d[k]!, x.d[k + 1]!)) : [];
    return {
      stage,
      count,
      fromPrev: k === 0 ? null : counts[k - 1].length ? count / counts[k - 1].length : 0,
      fromStart: counts[0].length ? count / counts[0].length : 0,
      dropOff: next === undefined ? 0 : count - next,
      medianDays: median(durations),
      ids: counts[k],
    };
  });
}

// ---- Value bands ------------------------------------------------------------------------

export interface BandRow {
  key: number;
  label: string;
  short: string;
  count: number;
  amount: number;
  share: number;
  investorShare: number;
  prevCount: number;
  prevAmount: number;
  concentrated: boolean;
  ids: string[];
}

export function bandLabels(b: Bands): string[] {
  const k = (n: number) => (n >= 1_000_000 ? `RM${n / 1_000_000} million` : `RM${(n / 1000).toLocaleString('en-MY')},000`);
  return [`${k(b[0])} and above`, `${k(b[1])} to below ${k(b[0])}`, `${k(b[2])} to below ${k(b[1])}`, `Below ${k(b[2])}`];
}

export function bandShortLabels(b: Bands): string[] {
  const k = (n: number) => (n >= 1_000_000 ? `RM${+(n / 1_000_000).toFixed(2)}m` : `RM${Math.round(n / 1000)}k`);
  return [`≥ ${k(b[0])}`, `${k(b[1])}–${k(b[0])}`, `${k(b[2])}–${k(b[1])}`, `< ${k(b[2])}`];
}

export const bandIndex = (amount: number, b: Bands) => (amount >= b[0] ? 0 : amount >= b[1] ? 1 : amount >= b[2] ? 2 : 3);

export function bands(b: Bands, at = AS_OF, prevAt?: string): BandRow[] {
  const act = activeInvestors(at);
  const total = act.reduce((a, m) => a + m.current, 0);
  const prev = prevAt ? activeInvestors(prevAt) : [];
  const labels = bandLabels(b);
  const shorts = bandShortLabels(b);
  return labels.map((label, k) => {
    const rows = act.filter((m) => bandIndex(m.current, b) === k);
    const prows = prev.filter((m) => bandIndex(m.current, b) === k);
    const amount = rows.reduce((a, m) => a + m.current, 0);
    const share = total ? amount / total : 0;
    const investorShare = act.length ? rows.length / act.length : 0;
    return {
      key: k, label, short: shorts[k], count: rows.length, amount, share, investorShare,
      prevCount: prows.length, prevAmount: prows.reduce((a, m) => a + m.current, 0),
      concentrated: share >= 0.5 && investorShare <= 0.25,
      ids: rows.map((m) => m.inv.id),
    };
  });
}

// ---- Period activity --------------------------------------------------------------------

export function investorActivity(r: Range) {
  const inR = (t: Transaction) => inRange(t.date, r);
  const failed = TRANSACTIONS.filter((t) => t.type === 'Top-up' && t.status === 'Failed' && inR(t));
  const withdrawals = TRANSACTIONS.filter((t) => t.type === 'Withdrawal' && t.status === 'Completed' && inR(t));
  return {
    onboarded: INVESTORS.filter((i) => i.approvedOn && inRange(i.approvedOn, r)).length,
    registered: INVESTORS.filter((i) => inRange(i.registeredOn, r)).length,
    failed,
    failedAmount: failed.reduce((a, t) => a + t.amount, 0),
    withdrawals,
    withdrawalAmount: withdrawals.reduce((a, t) => a + t.amount, 0),
    withdrawers: new Set(withdrawals.map((t) => t.investorId)).size,
  };
}
