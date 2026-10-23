/*
 * Reconciliation checks for the synthetic dataset. Run with `npm run verify:data`.
 * Each check mirrors a data-consistency rule from the prototype brief.
 */
import { AS_OF } from '../src/data/asOf';
import { GOVERNANCE } from '../src/data/governance';
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
const alertsBefore = buildAlerts(GOVERNANCE, th, 'CEO');
const closedGov = GOVERNANCE.map((g) => (g.id === 'GOV-114' ? { ...g, stage: 'Closed' as const } : g));
const alertsAfter = buildAlerts(closedGov, th, 'CEO');
check('Closing an item removes it from critical count',
  alertsAfter.filter((a) => a.severity === 'Critical').length === alertsBefore.filter((a) => a.severity === 'Critical').length - 1);
check('No alerts for closed governance items', alertsBefore.every((a) => !a.id.startsWith('AL-GOV') || govOpen(GOVERNANCE.find((g) => `AL-${g.id}` === a.id)!)));

// Role masking in derived text
const mgmtText = JSON.stringify(buildAlerts(GOVERNANCE, th, 'Management'));
check('Management View alerts contain no investor names', INVESTORS.every((i) => !mgmtText.includes(i.name)));

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
