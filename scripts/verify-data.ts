/*
 * Reconciliation checks for the synthetic dataset. Run with `npm run verify:data`.
 * Each check mirrors a data-consistency rule from the prototype brief.
 */
import { AS_OF } from '../src/data/asOf';
import { GOVERNANCE } from '../src/data/governance';
import { PROFILE_CHANGES } from '../src/data/profileChanges';
import { levelOf, riskProfileFor } from '../src/data/riskProfiles';
import { allActivity, investorExceptions } from '../src/lib/selectors/activity';
import { INVESTORS, SUBSCRIPTIONS, TRANSACTIONS } from '../src/data/investors';
import { ISSUERS } from '../src/data/issuers';
import { OBLIGATIONS } from '../src/data/obligations';
import { CYBER_RISKS, INCIDENTS } from '../src/data/tech';
import { DEFAULT_BANDS, DEFAULT_THRESHOLDS } from '../src/data/thresholds';
import { TRANCHES } from '../src/data/tranches';
import { buildAlerts } from '../src/lib/selectors/alerts';
import { allTrancheStats, closedPnl, monthlyRevenue, periodFinance } from '../src/lib/selectors/finance';
import { activeInvestors, allInvestorMetrics, bands, funnel, isCtosIncomplete, isKycIncomplete } from '../src/lib/selectors/investors';
import { govOpen, govOverdue, obligationOverdue } from '../src/lib/selectors/ops';
import { buildPeriod } from '../src/lib/period';
import { allocationTracker, subscriptionProgress } from '../src/lib/selectors/operations';
import { feeEvents, feeInvoices, feesIn, invoiceState, stepState, workflow } from '../src/lib/selectors/fees';
import { PNL } from '../src/data/pnl';

const th = DEFAULT_THRESHOLDS;
let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

// Volumes required by the brief
check('8–12 issuers', ISSUERS.length >= 8 && ISSUERS.length <= 12, `${ISSUERS.length}`);
check('12–18 tranches', TRANCHES.length >= 12 && TRANCHES.length <= 18, `${TRANCHES.length}`);
check('40–60 investors', INVESTORS.length >= 40 && INVESTORS.length <= 60, `${INVESTORS.length}`);
check('≥10 issuer obligations', OBLIGATIONS.length >= 10, `${OBLIGATIONS.length}`);
check('≥8 incidents', INCIDENTS.length >= 8, `${INCIDENTS.length}`);
check('≥8 cyber risks', CYBER_RISKS.length >= 8, `${CYBER_RISKS.length}`);
check('≥15 governance items', GOVERNANCE.length >= 15, `${GOVERNANCE.length}`);
check('≥12 closed P&L months', closedPnl(th).length >= 12, `${closedPnl(th).length}`);
check('Tranches across ≥5 stages', new Set(TRANCHES.map((t) => t.stage)).size >= 5);

// Revenue = successful × fee rate, never on pending/rejected/cancelled
const stats = allTrancheStats(th);
check('Revenue = successful × tranche fee rate', stats.every((s) => s.revenue === Math.round(s.successful * s.tranche.feeRate)));
check('No revenue on live/upcoming tranches', stats.filter((s) => ['Open', 'Fully Subscribed', 'Upcoming'].includes(s.tranche.stage)).every((s) => s.revenue === 0));
check('Live tranches have no allocated subscriptions', SUBSCRIPTIONS.filter((x) => x.status === 'Allocated').every((x) => {
  const t = TRANCHES.find((y) => y.id === x.trancheId)!;
  return !['Open', 'Fully Subscribed', 'Upcoming'].includes(t.stage);
}));
check('Fully Subscribed tranches ≥ 98% fulfilled', stats.filter((s) => s.tranche.stage === 'Fully Subscribed').every((s) => s.fulfilment >= 0.98));
check('Successful ≤ gross for every tranche', stats.every((s) => s.successful <= s.gross));

// P&L revenue reconciles to tranche revenue
check('P&L revenue = tranche recognised revenue by month', closedPnl(th).every((p) => p.revenue === monthlyRevenue(p.month, th).revenue));
const ytd = periodFinance(buildPeriod('YTD'), th);
check('YTD revenue = Σ tranche revenue closed YTD', ytd.revenue === stats.filter((s) => s.tranche.closeDate >= '2026-01-01' && s.tranche.closeDate <= AS_OF && s.successful > 0).reduce((a, s) => a + s.revenue, 0));

// Investors
const metrics = allInvestorMetrics();
const active = activeInvestors();
check('Every active investor has ≥1 current subscription', active.every((m) => m.currentCount >= 1));
check('Active investor count = Σ band counts', bands(DEFAULT_BANDS).reduce((a, b) => a + b.count, 0) === active.length);
check('Funds allocated = Σ band amounts', bands(DEFAULT_BANDS).reduce((a, b) => a + b.amount, 0) === active.reduce((a, m) => a + m.current, 0));
check('Every band populated', bands(DEFAULT_BANDS).every((b) => b.count > 0), bands(DEFAULT_BANDS).map((b) => b.count).join('/'));
check('Current allocations sum = Σ allocated in closed, unmatured tranches',
  active.reduce((a, m) => a + m.current, 0) === stats.filter((s) => ['Closed', 'Issued / Settled'].includes(s.tranche.stage)).reduce((a, s) => a + s.successful, 0));
check('No negative wallet balances', metrics.every((m) => m.wallet >= 0), `min ${Math.min(...metrics.map((m) => m.wallet))}`);
check('Several CTOS-incomplete records', INVESTORS.filter((i) => isCtosIncomplete(i)).length >= 3);
check('Several KYC-incomplete records', INVESTORS.filter((i) => isKycIncomplete(i)).length >= 3);
check('Several failed top-ups', TRANSACTIONS.filter((t) => t.type === 'Top-up' && t.status === 'Failed').length >= 3);
check('Several completed withdrawals', TRANSACTIONS.filter((t) => t.type === 'Withdrawal' && t.status === 'Completed').length >= 3);
check('Some withdrawers remain active', active.some((m) => m.withdrawals > 0));
check('Funnel is monotonic', funnel(null).every((s, k, a) => k === 0 || s.count <= a[k - 1].count));
check('Unique investor IDs', new Set(INVESTORS.map((i) => i.id)).size === INVESTORS.length);

// Overdue and closed items
check('Overdue obligations have due < as-of', OBLIGATIONS.filter(obligationOverdue).every((o) => o.dueDate < AS_OF));
check('Several overdue governance items', GOVERNANCE.filter(govOverdue).length >= 2);
check('Several blocked governance items', GOVERNANCE.filter((g) => govOpen(g) && g.blocker).length >= 2);
check('Some items completed on time', GOVERNANCE.filter((g) => g.completedOn && g.completedOn <= g.targetDate).length >= 2);
const alertsBefore = buildAlerts(GOVERNANCE, th);
const closedGov = GOVERNANCE.map((g) => (g.id === 'GOV-114' ? { ...g, stage: 'Closed' as const } : g));
const alertsAfter = buildAlerts(closedGov, th);
check('Closing an item removes it from critical count',
  alertsAfter.filter((a) => a.severity === 'Critical').length === alertsBefore.filter((a) => a.severity === 'Critical').length - 1);
check('No alerts for closed governance items', alertsBefore.every((a) => !a.id.startsWith('AL-GOV') || govOpen(GOVERNANCE.find((g) => `AL-${g.id}` === a.id)!)));

// Activity feed and investor exceptions
const okTopups = TRANSACTIONS.filter((t) => t.type === 'Top-up' && t.status === 'Successful');
check('Every successful top-up has a channel', okTopups.every((t) => t.channel === 'Investor' || t.channel === 'Manual'));
check('Top-ups + manual deposits = total deposits',
  okTopups.filter((t) => t.channel === 'Investor').reduce((a, t) => a + t.amount, 0) + okTopups.filter((t) => t.channel === 'Manual').reduce((a, t) => a + t.amount, 0)
  === metrics.reduce((a, m) => a + m.deposits, 0));
check('Profile changes reference real investors', PROFILE_CHANGES.every((c) => INVESTORS.some((i) => i.id === c.investorId)));
check('Profile summaries hide bank/contact values', PROFILE_CHANGES.every((c) => !/\d{6,}|@/.test(c.summary)));
check('Activity feed covers every profile change', PROFILE_CHANGES.every((c) => allActivity().some((e) => e.id === c.id)));
const ex = investorExceptions(th);
check('Failed top-up exception counts last-30-day failures',
  ex.find((e) => e.key === 'failed')!.count === TRANSACTIONS.filter((t) => t.type === 'Top-up' && t.status === 'Failed' && t.date >= '2026-09-23' && t.date <= AS_OF).length);
check('Bank-change alert lists every pending bank change', PROFILE_CHANGES.filter((c) => c.type === 'Bank account' && c.status === 'Pending review').every((c) => ex.find((e) => e.key === 'bank')!.ids.includes(c.investorId)));
check('Every account-behaviour alert fires on the synthetic data', ['large', 'roundtrip', 'bank'].every((k) => ex.find((e) => e.key === k)!.count > 0));

// Risk profile (synthetic AML/CDD)
const risks = INVESTORS.map((i) => riskProfileFor(i.id));
check('Every investor has exactly one risk level', risks.every((r) => ['Low', 'Medium', 'High'].includes(r.level)) && risks.length === INVESTORS.length);
check('Risk level follows the factor score', risks.every((r) => r.level === levelOf(r.factors)));
check('Only High risk needs review, and every High is pending or cleared', risks.every((r) => (r.level === 'High') === (r.review !== 'Not required')));

// Privacy: no investor names are held in the dashboard data
check('Investors carry ID and initials only (no name field)', INVESTORS.every((i) => !('name' in i) && /^[A-Z]{1,6}$/.test(i.initials)));

// Finance: fee model, payment schedule and invoices
const fees = feeEvents(th);
const { invoices, unbilled } = feeInvoices(th);
const earnedAll = fees.reduce((a, e) => a + e.amount, 0);
const invoicedAll = invoices.reduce((a, i) => a + i.amount, 0);
const unbilledAll = [...unbilled.values()].reduce((a, v) => a + v, 0);
check('Fees earned = invoiced + unbilled (rounding < RM 10)', Math.abs(earnedAll - invoicedAll - unbilledAll) < 10, `${earnedAll} vs ${invoicedAll} + ${Math.round(unbilledAll)}`);
check('No fee event after the reporting date', fees.every((e) => e.date <= AS_OF));
const invStates = invoices.map((i) => invoiceState(i));
check('No fee receipt predates its invoice or follows the reporting date', invStates.every((x) => !x.paid || (x.paid.date >= x.inv.date && x.paid.date <= AS_OF)));
check('Distribution and service fees are deducted at source, not invoiced', invStates.filter((x) => /Distribution|Service/.test(x.inv.fee)).every((x) => x.status === 'Deducted'));
check('Distribution fee events equal recognised revenue (successful × fee rate)', fees.filter((e) => e.group === 'distribution').reduce((a, e) => a + e.amount, 0) === allTrancheStats(th).filter((s) => ['Closed', 'Issued / Settled', 'Matured'].includes(s.tranche.stage)).reduce((a, s) => a + s.revenue, 0));
const octFees = feesIn(th, '2026-10-01', AS_OF);
check('Revenue card (all fees, Oct to date) equals the sum of fee events', octFees === fees.filter((e) => e.date >= '2026-10-01').reduce((a, e) => a + e.amount, 0), `RM ${octFees}`);
const released = new Map(allocationTracker().map((r) => [r.tranche.id, r.releasedOn]));
const flows = allTrancheStats(th).map((s) => ({ s, steps: workflow(s, released.get(s.tranche.id) ?? null).map((st) => stepState(st)) }));
check('Every payment due before the reporting date is complete', flows.every((f) => f.steps.every((x) => x.step.kind === 'delist' || x.step.due >= AS_OF || x.done)));
const shortSteps = flows.flatMap((f) => f.steps.filter((x) => x.step.kind === 'issuer' && !x.done && x.received > 0));
check('Shortfall example: Meranti Note 1 issuer payment part-received', shortSteps.some((x) => x.step.key.startsWith('TR-2602') && (x.step.amount ?? 0) - x.received === 584_250), shortSteps.map((x) => `${x.step.key} short ${(x.step.amount ?? 0) - x.received}`).join(', '));
check('Issuer receipts never exceed the amount due', flows.every((f) => f.steps.every((x) => x.step.kind !== 'issuer' || x.received <= (x.step.amount ?? 0))));
const budgetSep = PNL.find((m) => m.month === '2026-09')!.budget;
check('P&L revenue budget is on the all-fee basis (≥ 2× distribution budget scale)', budgetSep.revenue === 260_000 && budgetSep.ebitda === budgetSep.revenue - budgetSep.opex, `Sep budget RM ${budgetSep.revenue}`);
const alloc = allocationTracker();
check('Allocated ≤ investors on every tracked tranche', alloc.every((r) => r.allocated <= r.investors), alloc.map((r) => `${r.tranche.id} ${r.allocated}/${r.investors}`).join(', '));
check('Funds released only after allocation completes', alloc.every((r) => r.steps.release !== 'done' || r.steps.allocate === 'done'));
const prog = subscriptionProgress(th, 10);
check('Each tranche appears in one progress section only', new Set(prog.map((r) => r.tranche.id)).size === prog.length);
const live = subscriptionProgress(th, 0);
check('Overview progress has no recently closed tranches', live.every((r) => r.section !== 'Recently closed'));
check('Expected at close is never below raised', live.filter((r) => r.section === 'Current').every((r) => (r.projectedAtClose ?? 0) >= r.raised));
check('Verdict follows thresholds (filled / ≥100% / ≥80% / below)', live.filter((r) => r.section === 'Current').every((r) => {
  const t = r.tranche.target, p = r.projectedAtClose! / t;
  const want = r.raised >= t ? 'Filled' : r.risk === 'Critical' ? 'At risk' : p >= 1 ? 'On pace' : p >= 0.8 ? 'Close call' : 'At risk';
  return r.verdict === want;
}), live.filter((r) => r.verdict).map((r) => `${r.tranche.id} ${r.verdict}`).join(', '));

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
