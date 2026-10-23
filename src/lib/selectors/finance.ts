import { AS_OF, TREND_MONTHS, daysFromAsOf, monthEnd, monthKey, shiftMonthKey } from '../../data/asOf';
import { ISSUERS } from '../../data/issuers';
import { SUBSCRIPTIONS } from '../../data/investors';
import { LATEST_CLOSED_PNL_MONTH, PNL } from '../../data/pnl';
import { TRANCHES } from '../../data/tranches';
import type { Thresholds } from '../../data/thresholds';
import type { Tranche, TrancheStage } from '../../data/types';
import { inRange, type Range } from '../period';

export const issuerName = (id: string) => ISSUERS.find((i) => i.id === id)?.name ?? id;
export const issuerShort = (id: string) => issuerName(id).replace(/ Sdn Bhd$/, '');
export const trancheById = (id: string) => TRANCHES.find((t) => t.id === id);

export const isAllocatedStage = (s: TrancheStage) => s === 'Closed' || s === 'Issued / Settled' || s === 'Matured';
export const isLiveStage = (s: TrancheStage) => s === 'Open' || s === 'Fully Subscribed';
export const isActiveStage = (s: TrancheStage) => isLiveStage(s) || s === 'Closed' || s === 'Issued / Settled';

export interface TrancheStats {
  tranche: Tranche;
  issuer: string;
  gross: number;
  successful: number;
  pending: number;
  rejected: number;
  cancelled: number;
  subscribers: number;
  /** Closed tranches: successful ÷ target. Live tranches: pending valid requests ÷ target (indicative). */
  fulfilment: number;
  indicative: boolean;
  revenue: number;
  daysToClose: number;
  risk: 'Critical' | 'Attention' | 'On track' | 'Completed' | 'Not started';
  riskReason: string | null;
}

const statsCache = new Map<string, TrancheStats>();

export function trancheStats(t: Tranche, th: Thresholds): TrancheStats {
  const key = `${t.id}|${th.trancheClosingSoonDays}|${th.trancheUnderTargetPct}|${th.trancheCriticalPct}`;
  const hit = statsCache.get(key);
  if (hit) return hit;
  const subs = SUBSCRIPTIONS.filter((s) => s.trancheId === t.id);
  const sum = (st: string) => subs.filter((s) => s.status === st).reduce((a, s) => a + s.amount, 0);
  const successful = sum('Allocated');
  const pending = sum('Pending');
  const rejected = sum('Rejected');
  const cancelled = sum('Cancelled');
  const indicative = isLiveStage(t.stage);
  const fulfilment = t.target ? (indicative ? pending : successful) / t.target : 0;
  const subscribers = new Set(subs.filter((s) => s.status === 'Allocated' || s.status === 'Pending').map((s) => s.investorId)).size;
  const daysToClose = daysFromAsOf(t.closeDate);

  let risk: TrancheStats['risk'] = 'On track';
  let riskReason: string | null = null;
  if (t.stage === 'Upcoming') risk = 'Not started';
  else if (t.stage === 'Matured' || t.stage === 'Issued / Settled') risk = 'Completed';
  if (indicative && daysToClose <= th.trancheClosingSoonDays && fulfilment * 100 < th.trancheUnderTargetPct) {
    risk = fulfilment * 100 < th.trancheCriticalPct ? 'Critical' : 'Attention';
    riskReason = `${Math.round(fulfilment * 100)}% subscribed with ${daysToClose} days to close`;
  } else if (indicative) {
    // Linear pace check for open tranches.
    const elapsed = Math.max(1, daysFromAsOf(t.openDate) * -1);
    const total = Math.max(1, elapsed + daysToClose);
    const expected = elapsed / total;
    if (fulfilment < expected * 0.6) {
      risk = 'Attention';
      riskReason = `Below expected pace (${Math.round(fulfilment * 100)}% vs ~${Math.round(expected * 100)}%)`;
    }
  }
  const openException = t.exceptions.find((e) => !e.resolved);
  if (openException && risk !== 'Critical') {
    risk = 'Attention';
    riskReason = openException.text;
  }

  const s: TrancheStats = {
    tranche: t, issuer: issuerName(t.issuerId), gross: successful + pending + rejected + cancelled, successful, pending, rejected, cancelled,
    subscribers, fulfilment, indicative, revenue: Math.round(successful * t.feeRate), daysToClose, risk, riskReason,
  };
  statsCache.set(key, s);
  return s;
}

export const allTrancheStats = (th: Thresholds) => TRANCHES.map((t) => trancheStats(t, th));

/** Tranche results for tranches whose allocation (close) fell inside the range. */
export function periodFinance(r: Range, th: Thresholds) {
  const closed = allTrancheStats(th).filter((s) => isAllocatedStage(s.tranche.stage) && inRange(s.tranche.closeDate, r));
  const successful = closed.reduce((a, s) => a + s.successful, 0);
  const gross = closed.reduce((a, s) => a + s.gross, 0);
  const revenue = closed.reduce((a, s) => a + s.revenue, 0);
  return {
    tranches: closed,
    successful,
    gross,
    revenue,
    successRate: gross ? successful / gross : 0,
    feeRate: successful ? revenue / successful : 0,
  };
}

export interface PnlView {
  month: string;
  closed: boolean;
  revenue: number;
  personnel: number;
  marketing: number;
  technology: number;
  professional: number;
  premises: number;
  otherOpex: number;
  opex: number;
  ebitda: number;
  depreciation: number;
  financeCosts: number;
  netResult: number;
  budget: { revenue: number; opex: number; ebitda: number; netResult: number; subscriptions: number };
}

export function monthlyRevenue(month: string, th: Thresholds) {
  return allTrancheStats(th)
    .filter((s) => isAllocatedStage(s.tranche.stage) && monthKey(s.tranche.closeDate) === month)
    .reduce((a, s) => ({ subs: a.subs + s.successful, revenue: a.revenue + s.revenue }), { subs: 0, revenue: 0 });
}

export function pnlView(month: string, th: Thresholds): PnlView | null {
  const p = PNL.find((x) => x.month === month);
  if (!p) return null;
  const closed = month <= LATEST_CLOSED_PNL_MONTH;
  const revenue = monthlyRevenue(month, th).revenue;
  const opex = p.personnel + p.marketing + p.technology + p.professional + p.premises + p.otherOpex;
  const ebitda = revenue - opex;
  return {
    month, closed, revenue, personnel: p.personnel, marketing: p.marketing, technology: p.technology, professional: p.professional,
    premises: p.premises, otherOpex: p.otherOpex, opex, ebitda, depreciation: p.depreciation, financeCosts: p.financeCosts,
    netResult: ebitda - p.depreciation - p.financeCosts, budget: p.budget,
  };
}

export const closedPnl = (th: Thresholds) =>
  PNL.filter((p) => p.month <= LATEST_CLOSED_PNL_MONTH).map((p) => pnlView(p.month, th)!);

/** Latest closed month-end P&L whose month ended on or before the end of the range. */
export function latestPnlFor(r: Range, th: Thresholds): PnlView {
  let key = monthKey(r.end);
  if (r.end < monthEnd(key)) key = shiftMonthKey(key, -1);
  if (key > LATEST_CLOSED_PNL_MONTH) key = LATEST_CLOSED_PNL_MONTH;
  return pnlView(key, th) ?? pnlView(PNL[0].month, th)!;
}

export function trendSeries(th: Thresholds) {
  return TREND_MONTHS.map((m) => {
    const r = monthlyRevenue(m, th);
    const p = pnlView(m, th);
    return {
      month: m,
      subs: r.subs,
      revenue: r.revenue,
      budgetSubs: p?.budget.subscriptions ?? null,
      budgetRevenue: p?.budget.revenue ?? null,
      opex: p?.closed ? p.opex : null,
      ebitda: p?.closed ? p.ebitda : null,
      netResult: p?.closed ? p.netResult : null,
      partial: m === monthKey(AS_OF),
    };
  });
}

export const STAGE_ORDER: TrancheStage[] = ['Upcoming', 'Open', 'Fully Subscribed', 'Closed', 'Issued / Settled', 'Matured'];
