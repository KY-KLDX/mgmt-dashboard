import { INVESTORS } from '../../data/investors';
import type { Bands, Thresholds } from '../../data/thresholds';
import type { Range } from '../period';
import { investorExceptions } from './activity';
import { FUNNEL_STAGES, allInvestorMetrics, bands, funnel, isCtosIncomplete, isKycIncomplete } from './investors';

/**
 * Named investor lists used by chart clicks, exceptions and links.
 * Keys: group:<active|idle|pending>, onboarding, band:<n>, funnel:<stage index>:<period|all>, exception:<key|all>.
 */
export function resolveInvestorList(key: string, ctx: { thresholds: Thresholds; bands: Bands; period: Range }): { title: string; ids: string[] } {
  if (key.startsWith('group:')) {
    const g = key.slice(6);
    const ids = allInvestorMetrics()
      .filter((m) => (g === 'active' ? m.currentCount > 0 : g === 'idle' ? m.currentCount === 0 && !!m.inv.approvedOn : !m.inv.approvedOn))
      .map((m) => m.inv.id);
    return { title: g === 'active' ? 'Active investors' : g === 'idle' ? 'Approved, not invested' : 'Not yet verified', ids };
  }
  if (key === 'onboarding') {
    return { title: 'Onboarding incomplete', ids: INVESTORS.filter((i) => isCtosIncomplete(i) || isKycIncomplete(i)).map((i) => i.id) };
  }
  if (key.startsWith('band:')) {
    const b = bands(ctx.bands)[Number(key.slice(5))];
    return { title: b ? `Value band ${b.short}` : 'Value band', ids: b?.ids ?? [] };
  }
  if (key.startsWith('funnel:')) {
    const [, k, cohort] = key.split(':');
    const f = funnel(cohort === 'all' ? null : ctx.period);
    const n = Number(k);
    if (!f[n]) return { title: 'Funnel stage', ids: [] };
    const next = new Set(f[n + 1]?.ids ?? []);
    return { title: `Stopped at ${FUNNEL_STAGES[n]}`, ids: f[n].ids.filter((x) => n === f.length - 1 || !next.has(x)) };
  }
  if (key.startsWith('exception:')) {
    const all = investorExceptions(ctx.thresholds);
    const ex = all.find((e) => e.key === key.slice(10));
    return { title: ex?.title ?? 'All exceptions', ids: ex ? ex.ids : [...new Set(all.flatMap((e) => e.ids))] };
  }
  return { title: 'Investors', ids: [] };
}
