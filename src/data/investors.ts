import { AS_OF, addDays, daysBetween } from './asOf';
import { createRng, roundTo } from './prng';
import { TRANCHES, TRANCHE_FILL } from './tranches';
import type { Investor, StepStatus, Subscription, Transaction, Tranche } from './types';

/*
 * Deterministic generator for synthetic investors, subscriptions and wallet transactions.
 * Tranche subscription totals are built from these records, so every tranche figure,
 * investor figure and KPI reconciles by construction. All names are fictional.
 */

type Tier = 'whale' | 'large' | 'mid' | 'small';
type Category =
  | { kind: 'active'; tier: Tier }
  | { kind: 'funded' } // deposited, no current subscription (matured-only or pending-only)
  | { kind: 'approved' } // approved, never deposited
  | { kind: 'pendingApproval' }
  | { kind: 'kycIncomplete' }
  | { kind: 'ctosIncomplete' }
  | { kind: 'registered' };

interface Seed {
  name: string;
  type: 'Individual' | 'Corporate';
  cat: Category;
  reg: string;
}

const A = (tier: Tier): Category => ({ kind: 'active', tier });

const SEEDS: Seed[] = [
  // Active — RM1 million and above
  { name: 'Bayu Timur Capital Sdn Bhd', type: 'Corporate', cat: A('whale'), reg: '2025-08-12' },
  { name: 'Lim Kok Seng', type: 'Individual', cat: A('whale'), reg: '2025-08-20' },
  { name: 'Puncak Waris Holdings Sdn Bhd', type: 'Corporate', cat: A('whale'), reg: '2025-09-03' },
  { name: 'Nurul Huda Ismail', type: 'Individual', cat: A('whale'), reg: '2025-09-18' },
  { name: 'Ravindran Pillai', type: 'Individual', cat: A('whale'), reg: '2025-10-07' },
  { name: 'Sentosa Family Office Sdn Bhd', type: 'Corporate', cat: A('whale'), reg: '2025-11-02' },
  { name: 'Ong Mei Ling', type: 'Individual', cat: A('whale'), reg: '2025-12-15' },
  { name: 'Harimau Emas Ventures Sdn Bhd', type: 'Corporate', cat: A('whale'), reg: '2026-02-09' },
  { name: 'Azman Shafie', type: 'Individual', cat: A('whale'), reg: '2026-03-22' },
  // Active — RM500k to below RM1m
  { name: 'Chong Wai Keat', type: 'Individual', cat: A('large'), reg: '2025-08-25' },
  { name: 'Farah Adlina Yusof', type: 'Individual', cat: A('large'), reg: '2025-09-28' },
  { name: 'Kenanga Hijau Trading Sdn Bhd', type: 'Corporate', cat: A('large'), reg: '2025-10-30' },
  { name: 'Suresh Menon', type: 'Individual', cat: A('large'), reg: '2025-12-02' },
  { name: 'Tan Hui Wen', type: 'Individual', cat: A('large'), reg: '2026-01-14' },
  { name: 'Mohd Hafiz Zulkifli', type: 'Individual', cat: A('large'), reg: '2026-02-26' },
  { name: 'Wong Jia Hui', type: 'Individual', cat: A('large'), reg: '2026-04-08' },
  { name: 'Delima Estates Sdn Bhd', type: 'Corporate', cat: A('large'), reg: '2026-05-19' },
  // Active — RM100k to below RM500k
  { name: 'Siti Mariam Abdullah', type: 'Individual', cat: A('mid'), reg: '2025-09-09' },
  { name: 'Goh Chee Keong', type: 'Individual', cat: A('mid'), reg: '2025-10-21' },
  { name: 'Kavitha Rajan', type: 'Individual', cat: A('mid'), reg: '2025-11-26' },
  { name: 'Amirul Hakim Rosli', type: 'Individual', cat: A('mid'), reg: '2026-01-06' },
  { name: 'Yap Siew Lan', type: 'Individual', cat: A('mid'), reg: '2026-02-17' },
  { name: 'Norazlina Hamid', type: 'Individual', cat: A('mid'), reg: '2026-03-30' },
  { name: 'Leong Kar Wai', type: 'Individual', cat: A('mid'), reg: '2026-05-04' },
  { name: 'Deepa Krishnan', type: 'Individual', cat: A('mid'), reg: '2026-06-15' },
  { name: 'Zainal Arifin Omar', type: 'Individual', cat: A('mid'), reg: '2026-07-20' },
  { name: 'Teoh Boon Huat', type: 'Individual', cat: A('mid'), reg: '2026-08-11' },
  { name: 'Melati Kasih Enterprise', type: 'Corporate', cat: A('mid'), reg: '2026-08-26' },
  // Active — below RM100k
  { name: 'Aisyah Kamarudin', type: 'Individual', cat: A('small'), reg: '2025-10-14' },
  { name: 'Lee Zhi Hao', type: 'Individual', cat: A('small'), reg: '2026-01-20' },
  { name: 'Prakash Subramaniam', type: 'Individual', cat: A('small'), reg: '2026-03-05' },
  { name: 'Nur Izzati Hassan', type: 'Individual', cat: A('small'), reg: '2026-04-27' },
  { name: 'Chan Kah Yee', type: 'Individual', cat: A('small'), reg: '2026-06-02' },
  { name: 'Haziq Firdaus Ahmad', type: 'Individual', cat: A('small'), reg: '2026-07-08' },
  { name: 'Low Pei Shan', type: 'Individual', cat: A('small'), reg: '2026-08-18' },
  { name: 'Arjun Nadarajah', type: 'Individual', cat: A('small'), reg: '2026-09-01' },
  { name: 'Syafiqah Rahim', type: 'Individual', cat: A('small'), reg: '2026-09-08' },
  // Funded, no current subscription
  { name: 'Khoo Teng Chuan', type: 'Individual', cat: { kind: 'funded' }, reg: '2025-09-01' },
  { name: 'Rosnah Mat Isa', type: 'Individual', cat: { kind: 'funded' }, reg: '2025-10-05' },
  { name: 'Vijay Ananthan', type: 'Individual', cat: { kind: 'funded' }, reg: '2025-11-11' },
  { name: 'Lau Siew Ping', type: 'Individual', cat: { kind: 'funded' }, reg: '2026-05-25' },
  { name: 'Ikhwan Nazri', type: 'Individual', cat: { kind: 'funded' }, reg: '2026-07-29' },
  { name: 'Sri Mutiara Resources Sdn Bhd', type: 'Corporate', cat: { kind: 'funded' }, reg: '2026-09-15' },
  // Approved, not yet funded
  { name: 'Tham Wei Lun', type: 'Individual', cat: { kind: 'approved' }, reg: '2026-06-23' },
  { name: 'Hidayah Sulaiman', type: 'Individual', cat: { kind: 'approved' }, reg: '2026-08-04' },
  { name: 'Ganesh Muthu', type: 'Individual', cat: { kind: 'approved' }, reg: '2026-09-21' },
  // Pending account approval
  { name: 'Ng Swee Lin', type: 'Individual', cat: { kind: 'pendingApproval' }, reg: '2026-10-06' },
  { name: 'Faizal Rahman', type: 'Individual', cat: { kind: 'pendingApproval' }, reg: '2026-10-11' },
  // KYC incomplete
  { name: 'Cheah Li Ying', type: 'Individual', cat: { kind: 'kycIncomplete' }, reg: '2026-08-30' },
  { name: 'Shahrul Nizam Daud', type: 'Individual', cat: { kind: 'kycIncomplete' }, reg: '2026-09-24' },
  { name: 'Meenakshi Raj', type: 'Individual', cat: { kind: 'kycIncomplete' }, reg: '2026-10-08' },
  { name: 'Tiara Murni Holdings Sdn Bhd', type: 'Corporate', cat: { kind: 'kycIncomplete' }, reg: '2026-10-15' },
  // CTOS incomplete
  { name: 'Koh Jun Jie', type: 'Individual', cat: { kind: 'ctosIncomplete' }, reg: '2026-09-02' },
  { name: 'Aminah Jaafar', type: 'Individual', cat: { kind: 'ctosIncomplete' }, reg: '2026-09-27' },
  { name: 'Lok Wen Xuan', type: 'Individual', cat: { kind: 'ctosIncomplete' }, reg: '2026-10-13' },
  { name: 'Rizal Hakimi', type: 'Individual', cat: { kind: 'ctosIncomplete' }, reg: '2026-10-19' },
  // Registered only
  { name: 'Pang Hui Min', type: 'Individual', cat: { kind: 'registered' }, reg: '2026-10-17' },
  { name: 'Danial Iskandar', type: 'Individual', cat: { kind: 'registered' }, reg: '2026-10-21' },
];

const rng = createRng(20261023);

const TIER_TICKET: Record<Tier, [number, number]> = {
  whale: [350_000, 1_100_000],
  large: [55_000, 190_000],
  mid: [25_000, 110_000],
  small: [5_000, 28_000],
};
const TIER_JOIN: Record<Tier, number> = { whale: 0.55, large: 0.36, mid: 0.3, small: 0.18 };

interface Draft {
  inv: Investor;
  cat: Category;
  firstDeposit: string | null;
}

// ---- Investors and onboarding timelines -------------------------------------------------

const drafts: Draft[] = SEEDS.map((s, i) => {
  const id = `INV-${1001 + i * 3 + (i % 2)}`;
  const k = s.cat.kind;
  const started = k === 'registered' ? null : addDays(s.reg, rng.int(0, 2));
  const ctosDone = ['registered', 'ctosIncomplete'].includes(k) ? null : addDays(started!, rng.int(1, 5));
  const kycDone = ctosDone && k !== 'kycIncomplete' ? addDays(ctosDone, rng.int(1, 8)) : null;
  const approved = kycDone && k !== 'pendingApproval' ? addDays(kycDone, rng.int(1, 4)) : null;
  const firstDeposit = approved && (k === 'active' || k === 'funded') ? addDays(approved, rng.int(0, 9)) : null;

  const ctos: StepStatus = ctosDone ? 'Completed' : started ? 'Incomplete' : 'Not started';
  const kyc: StepStatus = kycDone ? 'Completed' : ctosDone ? 'Incomplete' : 'Not started';

  const inv: Investor = {
    id,
    name: s.name,
    type: s.type,
    registeredOn: s.reg,
    onboardingStartedOn: started,
    ctosCompletedOn: ctosDone,
    kycCompletedOn: kycDone,
    approvedOn: approved,
    ctos,
    kyc,
    accountStatus: 'Registered',
    issues: [],
    lastActivity: s.reg,
  };
  return { inv, cat: s.cat, firstDeposit };
});

// ---- Subscriptions ----------------------------------------------------------------------

const subs: Subscription[] = [];
let subSeq = 1;
const addSub = (investorId: string, t: Tranche, amount: number, requestedOn: string, status: Subscription['status']) => {
  subs.push({ id: `SUB-${String(subSeq++).padStart(4, '0')}`, investorId, trancheId: t.id, amount, requestedOn, status });
};

const isCurrentTranche = (t: Tranche) => ['Closed', 'Issued / Settled'].includes(t.stage);
const isLiveTranche = (t: Tranche) => ['Open', 'Fully Subscribed'].includes(t.stage);

const requestDate = (t: Tranche, from: string | null) => {
  const start = from && from > t.openDate ? from : t.openDate;
  const end = t.stage === 'Open' || t.stage === 'Fully Subscribed' ? (t.closeDate < AS_OF ? t.closeDate : AS_OF) : t.closeDate;
  const span = Math.max(0, daysBetween(start, end) - 1);
  return addDays(start, rng.int(0, span));
};

const eligible = (d: Draft, t: Tranche) => d.firstDeposit !== null && daysBetween(d.firstDeposit, t.closeDate) >= 2 && (!isLiveTranche(t) || d.firstDeposit <= AS_OF);

const activeDrafts = drafts.filter((d) => d.cat.kind === 'active');
const fundedDrafts = drafts.filter((d) => d.cat.kind === 'funded');

const ticket = (tier: Tier) => roundTo(rng.range(...TIER_TICKET[tier]), 1000);

for (const t of TRANCHES) {
  if (t.stage === 'Upcoming') continue;
  const pool = roundTo(t.target * TRANCHE_FILL[t.id], 1000);
  const status: Subscription['status'] = isLiveTranche(t) ? 'Pending' : 'Allocated';
  let filled = 0;

  // Matured and live tranches may include investors without a current holding.
  const participants = [...activeDrafts, ...(t.stage === 'Matured' || isLiveTranche(t) ? fundedDrafts : [])];
  const guaranteed = new Set<string>();

  // Every active investor needs at least one current allocation; give each one a home tranche.
  if (isCurrentTranche(t)) {
    for (const d of activeDrafts) {
      if (subs.some((s) => s.investorId === d.inv.id && TRANCHES.find((x) => x.id === s.trancheId && isCurrentTranche(x)))) continue;
      const options = TRANCHES.filter((x) => isCurrentTranche(x) && eligible(d, x));
      const lastOption = options[options.length - 1];
      if (lastOption?.id === t.id || (options.includes(t) && rng.next() < 0.35)) {
        const tier = (d.cat as { tier: Tier }).tier;
        const amt = Math.min(ticket(tier), pool - filled);
        if (amt >= 5000) {
          addSub(d.inv.id, t, amt, requestDate(t, d.firstDeposit), status);
          filled += amt;
          guaranteed.add(d.inv.id);
        }
      }
    }
  }

  let guard = 0;
  while (filled < pool && guard++ < 40) {
    for (const d of rng.shuffle(participants)) {
      if (filled >= pool) break;
      if (!eligible(d, t) || guaranteed.has(d.inv.id)) continue;
      if (subs.some((s) => s.investorId === d.inv.id && s.trancheId === t.id)) continue;
      const tier: Tier = d.cat.kind === 'active' ? d.cat.tier : 'mid';
      if (rng.next() > TIER_JOIN[tier]) continue;
      const remaining = pool - filled;
      let amt = Math.min(ticket(tier), remaining);
      if (remaining - amt < 5000) amt = remaining;
      addSub(d.inv.id, t, amt, requestDate(t, d.firstDeposit), status);
      filled += amt;
    }
  }

  // A few requests that never count toward successful subscriptions or revenue.
  if (t.stage !== 'Open' || t.id === 'TR-2613') {
    const extras = rng.int(1, 3);
    for (let i = 0; i < extras; i++) {
      const d = rng.pick(activeDrafts);
      if (!eligible(d, t)) continue;
      const st = rng.next() < 0.55 ? 'Rejected' : 'Cancelled';
      addSub(d.inv.id, t, roundTo(rng.range(20_000, 180_000), 1000), requestDate(t, d.firstDeposit), st);
    }
  }
}

// ---- Wallet transactions ----------------------------------------------------------------

const txns: Transaction[] = [];
let txSeq = 1;
const addTxn = (t: Omit<Transaction, 'id'>) => txns.push({ id: `TXN-${String(txSeq++).padStart(5, '0')}`, ...t });

const trancheById = new Map(TRANCHES.map((t) => [t.id, t]));

// Completed withdrawals for a spread of investors (some remain active).
const WITHDRAWERS = new Set(['INV-1005', 'INV-1013', 'INV-1031', 'INV-1043', 'INV-1055', 'INV-1073', 'INV-1089', 'INV-1113', 'INV-1115', 'INV-1121', 'INV-1125']);

for (const d of drafts) {
  if (!d.firstDeposit) continue;
  const mine = subs.filter((s) => s.investorId === d.inv.id);
  const allocated = mine.filter((s) => s.status === 'Allocated');
  const pending = mine.filter((s) => s.status === 'Pending');

  // Maturity returns: principal plus synthetic profit credited back to the wallet.
  let returns = 0;
  for (const s of allocated) {
    const t = trancheById.get(s.trancheId)!;
    if (t.stage === 'Matured') {
      const amt = Math.round(s.amount * (1 + (t.profitRate * t.tenorMonths) / 12));
      returns += amt;
      addTxn({ investorId: d.inv.id, type: 'Maturity return', amount: amt, date: t.maturityDate, status: 'Completed', note: `${t.name} principal and profit` });
    }
  }

  let withdrawn = 0;
  if (WITHDRAWERS.has(d.inv.id)) {
    const n = rng.int(1, 2);
    for (let i = 0; i < n; i++) {
      const amt = roundTo(returns > 0 && i === 0 ? returns * rng.range(0.4, 0.9) : rng.range(8_000, 120_000), 500);
      withdrawn += amt;
      const date = addDays(AS_OF, -rng.int(3, 160));
      addTxn({ investorId: d.inv.id, type: 'Withdrawal', amount: amt, date: date < d.firstDeposit ? addDays(d.firstDeposit, 20) : date, status: 'Completed', note: 'To registered bank account' });
    }
  }

  const tier: Tier = d.cat.kind === 'active' ? d.cat.tier : 'mid';
  const walletTarget =
    d.cat.kind === 'funded'
      ? roundTo(rng.range(30_000, 420_000), 100)
      : tier === 'whale'
        ? roundTo(rng.range(40_000, 900_000), 100)
        : roundTo(rng.range(500, tier === 'large' ? 160_000 : 40_000), 100);

  const outflow = [...allocated, ...pending].reduce((a, s) => a + s.amount, 0) + withdrawn;
  const needed = Math.max(5_000, outflow + walletTarget - returns);

  const parts = Math.min(6, Math.max(1, Math.round(needed / 400_000)) + rng.int(0, 2));
  let remaining = needed;
  const lastSubDate = mine.reduce((a, s) => (s.requestedOn > a ? s.requestedOn : a), d.firstDeposit);
  for (let i = 0; i < parts; i++) {
    const amt = i === parts - 1 ? remaining : roundTo((needed / parts) * rng.range(0.7, 1.3), 500);
    remaining -= amt;
    const span = Math.max(0, daysBetween(d.firstDeposit, lastSubDate) - 1);
    const date = i === 0 ? d.firstDeposit : addDays(d.firstDeposit, rng.int(0, span));
    addTxn({ investorId: d.inv.id, type: 'Top-up', amount: amt, date, status: 'Successful', note: rng.pick(['FPX online banking', 'DuitNow transfer', 'Bank transfer']) });
  }
}

// Failed top-ups (final status) and pending top-ups (excluded from failed counts).
const FAILED: [string, number, string, string][] = [
  ['INV-1007', 750_000, '2026-10-19', 'Bank rejected: payer name does not match account holder'],
  ['INV-1029', 48_000, '2026-10-14', 'FPX session timed out'],
  ['INV-1041', 120_000, '2026-10-09', 'Exceeded bank daily transfer limit'],
  ['INV-1089', 9_500, '2026-10-21', 'Insufficient funds at source bank'],
  ['INV-1091', 15_000, '2026-10-02', 'FPX session timed out'],
  ['INV-1013', 260_000, '2026-09-24', 'Exceeded bank daily transfer limit'],
  ['INV-1067', 30_000, '2026-09-12', 'Payment gateway error'],
  ['INV-1121', 5_000, '2026-08-28', 'Insufficient funds at source bank'],
  ['INV-1131', 75_000, '2026-10-20', 'Bank rejected: account type not supported'],
];
for (const [investorId, amount, date, note] of FAILED) addTxn({ investorId, type: 'Top-up', amount, date, status: 'Failed', note });
for (const [investorId, amount, date] of [
  ['INV-1035', 60_000, '2026-10-22'],
  ['INV-1101', 12_000, '2026-10-23'],
  ['INV-1131', 25_000, '2026-10-22'],
] as const) {
  addTxn({ investorId, type: 'Top-up', amount, date, status: 'Pending', note: 'Awaiting bank confirmation' });
}

txns.sort((a, b) => (a.date < b.date ? -1 : 1));

// ---- Derived account status, issues and last activity ------------------------------------

const ISSUE_NOTES: Record<string, string[]> = {
  'INV-1007': ['High-value top-up failed (payer name mismatch). Source-of-funds check requested.'],
  'INV-1041': ['Repeated top-up failures due to bank transfer limit.'],
  'INV-1131': ['Top-up rejected: unsupported account type. Investor contacted 21 Oct.'],
};

for (const d of drafts) {
  const inv = d.inv;
  const hasCurrent = subs.some((s) => {
    const t = trancheById.get(s.trancheId)!;
    return s.investorId === inv.id && s.status === 'Allocated' && isCurrentTranche(t);
  });
  inv.accountStatus = hasCurrent
    ? 'Active'
    : inv.approvedOn
      ? 'Approved'
      : inv.kycCompletedOn
        ? 'Pending approval'
        : inv.onboardingStartedOn
          ? 'Onboarding'
          : 'Registered';
  if (inv.id === 'INV-1007') inv.accountStatus = 'Under review';

  const issues = [...(ISSUE_NOTES[inv.id] ?? [])];
  const age = daysBetween(inv.registeredOn, AS_OF);
  if (inv.ctos === 'Incomplete') issues.push(`CTOS consent or check not completed (${age} days since registration).`);
  if (inv.kyc === 'Incomplete') issues.push(`KYC verification incomplete (${age} days since registration).`);
  inv.issues = issues;

  const dates = [
    inv.registeredOn,
    inv.onboardingStartedOn,
    inv.ctosCompletedOn,
    inv.kycCompletedOn,
    inv.approvedOn,
    ...subs.filter((s) => s.investorId === inv.id).map((s) => s.requestedOn),
    ...txns.filter((t) => t.investorId === inv.id && t.date <= AS_OF).map((t) => t.date),
  ].filter((x): x is string => !!x);
  inv.lastActivity = dates.reduce((a, b) => (b > a ? b : a));
}

export const INVESTORS: Investor[] = drafts.map((d) => d.inv);
export const SUBSCRIPTIONS: Subscription[] = subs;
export const TRANSACTIONS: Transaction[] = txns;
