import { AS_OF, addDays, daysBetween } from '../../data/asOf';
import { INVESTORS, SUBSCRIPTIONS, TRANSACTIONS } from '../../data/investors';
import { PROFILE_CHANGES } from '../../data/profileChanges';
import { TRANCHES } from '../../data/tranches';
import type { Thresholds } from '../../data/thresholds';
import type { ProfileChangeType } from '../../data/types';
import { inRange, type Range } from '../period';
import { isCtosIncomplete, isKycIncomplete } from './investors';

export type ActivityTag = 'Top-up' | 'Manual deposit' | 'Subscription' | 'Withdrawal' | 'Payout' | 'Onboarding' | 'Profile update' | 'Pending' | 'Failed';
export type ActivityTab = 'all' | 'subscriptions' | 'topups' | 'manual' | 'profile';

export interface ActivityEvent {
  id: string;
  investorId: string;
  tag: ActivityTag;
  /** One line, e.g. "Top-up received" or "Updated investor type". */
  text: string;
  amount: number | null;
  date: string;
  time: string;
  /** Needs a human look (failed payment, bank change awaiting review). */
  flag: boolean;
  tab: ActivityTab;
}

const trancheName = new Map(TRANCHES.map((t) => [t.id, t.name]));

/** Deterministic HH:MM so the synthetic feed reads like a real one. */
function timeFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${String(8 + (h % 11)).padStart(2, '0')}:${String((h >>> 5) % 60).padStart(2, '0')}`;
}

const PROFILE_TEXT: Record<ProfileChangeType, string> = {
  'Investor type': 'Updated investor type',
  'Contact details': 'Updated contact details',
  'Bank account': 'Changed bank account',
  'Address / ID re-verification': 'Updated address / ID',
};

let cache: ActivityEvent[] | null = null;

/** Every investor event up to the reporting date, newest first. */
export function allActivity(): ActivityEvent[] {
  if (cache) return cache;
  const ev: ActivityEvent[] = [];
  const add = (e: Omit<ActivityEvent, 'time'> & { time?: string }) => ev.push({ ...e, time: e.time ?? timeFor(e.id) });

  for (const i of INVESTORS) {
    add({ id: `${i.id}-reg`, investorId: i.id, tag: 'Onboarding', text: 'Registered', amount: null, date: i.registeredOn, flag: false, tab: 'all' });
    if (i.ctosCompletedOn) add({ id: `${i.id}-ctos`, investorId: i.id, tag: 'Onboarding', text: 'CTOS check completed', amount: null, date: i.ctosCompletedOn, flag: false, tab: 'all' });
    if (i.kycCompletedOn) add({ id: `${i.id}-kyc`, investorId: i.id, tag: 'Onboarding', text: 'KYC completed', amount: null, date: i.kycCompletedOn, flag: false, tab: 'all' });
    if (i.approvedOn) add({ id: `${i.id}-appr`, investorId: i.id, tag: 'Onboarding', text: 'Account approved', amount: null, date: i.approvedOn, flag: false, tab: 'all' });
  }
  for (const s of SUBSCRIPTIONS) {
    const name = trancheName.get(s.trancheId) ?? s.trancheId;
    const text = s.status === 'Rejected' ? `Subscription rejected · ${name}` : s.status === 'Cancelled' ? `Subscription cancelled · ${name}` : `New subscription · ${name}`;
    add({ id: s.id, investorId: s.investorId, tag: s.status === 'Rejected' ? 'Failed' : 'Subscription', text, amount: s.amount, date: s.requestedOn, flag: false, tab: 'subscriptions' });
  }
  for (const t of TRANSACTIONS) {
    if (t.date > AS_OF) continue;
    if (t.type === 'Top-up') {
      const manual = t.channel === 'Manual';
      const text = t.status === 'Failed' ? 'Top-up failed' : t.status === 'Pending' ? 'Top-up pending' : manual ? 'Manual deposit credited' : 'Top-up received';
      add({ id: t.id, investorId: t.investorId, tag: t.status === 'Failed' ? 'Failed' : t.status === 'Pending' ? 'Pending' : manual ? 'Manual deposit' : 'Top-up', text, amount: t.amount, date: t.date, flag: t.status === 'Failed', tab: manual ? 'manual' : 'topups' });
    } else if (t.type === 'Withdrawal') {
      add({ id: t.id, investorId: t.investorId, tag: 'Withdrawal', text: 'Withdrawal completed', amount: t.amount, date: t.date, flag: false, tab: 'all' });
    } else {
      add({ id: t.id, investorId: t.investorId, tag: 'Payout', text: 'Maturity payout', amount: t.amount, date: t.date, flag: false, tab: 'all' });
    }
  }
  for (const c of PROFILE_CHANGES) {
    add({ id: c.id, investorId: c.investorId, tag: 'Profile update', text: PROFILE_TEXT[c.type], amount: null, date: c.date, time: c.time, flag: c.status === 'Pending review', tab: 'profile' });
  }
  cache = ev.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  return cache;
}

export function activityIn(r: Range, tab: ActivityTab = 'all'): ActivityEvent[] {
  return allActivity().filter((e) => inRange(e.date, r) && (tab === 'all' || e.tab === tab));
}

// ---- Priority exceptions ------------------------------------------------------------------

export interface InvestorException {
  key: 'failed' | 'stalls' | 'kyc' | 'review';
  title: string;
  rule: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Review';
  ids: string[];
  /** Number of items (transactions for failed top-ups, investors otherwise). */
  count: number;
}

const lastStep = (id: string) => {
  const i = INVESTORS.find((x) => x.id === id)!;
  return [i.registeredOn, i.onboardingStartedOn, i.ctosCompletedOn, i.kycCompletedOn].filter((d): d is string => !!d).sort().pop()!;
};

export function investorExceptions(th: Thresholds): InvestorException[] {
  const since = addDays(AS_OF, -30);
  const failed = TRANSACTIONS.filter((t) => t.type === 'Top-up' && t.status === 'Failed' && t.date >= since && t.date <= AS_OF);
  const stalls = INVESTORS.filter((i) => isCtosIncomplete(i) && daysBetween(lastStep(i.id), AS_OF) >= 7);
  const kyc = INVESTORS.filter((i) => (isKycIncomplete(i) || (i.kycCompletedOn && !i.approvedOn)) && daysBetween(lastStep(i.id), AS_OF) >= 7);
  const review = new Set([
    ...INVESTORS.filter((i) => i.accountStatus === 'Under review').map((i) => i.id),
    ...PROFILE_CHANGES.filter((c) => c.status === 'Pending review').map((c) => c.investorId),
  ]);
  return [
    {
      key: 'failed', title: 'Failed top-ups', rule: 'Top-ups that failed in the last 30 days. Retry or contact the investor.',
      severity: failed.some((t) => t.amount >= th.highValueTopUp) ? 'Critical' : 'High',
      ids: [...new Set(failed.map((t) => t.investorId))], count: failed.length,
    },
    { key: 'stalls', title: 'Onboarding stalls', rule: 'Started onboarding but stuck at CTOS for 7+ days.', severity: 'High', ids: stalls.map((i) => i.id), count: stalls.length },
    { key: 'kyc', title: 'KYC aging', rule: 'KYC or approval pending for 7+ days.', severity: 'Medium', ids: kyc.map((i) => i.id), count: kyc.length },
    { key: 'review', title: 'Accounts under review', rule: 'Flagged funding or a recent bank-account change to verify.', severity: 'Review', ids: [...review], count: review.size },
  ];
}
