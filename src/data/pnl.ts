import type { PnlMonth } from './types';

/*
 * Synthetic company-level month-end P&L (operating cost lines and budget only).
 * Revenue is NOT stored here: it is taken from tranche recognised revenue for the month,
 * so the P&L revenue line always reconciles to the tranche table. Costs are not allocated
 * to individual tranches, so no tranche-level profit is calculated anywhere.
 */
type Row = [string, number, number, number, number, number, number, number, number, number, number];
// month, personnel, marketing, technology, professional, premises, other, D&A, finance, budget revenue, budget subscriptions
const ROWS: Row[] = [
  ['2025-10', 118_400, 24_300, 30_100, 14_800, 16_500, 5_200, 8_900, 1_900, 70_000, 2_600_000],
  ['2025-11', 119_100, 31_800, 30_400, 12_600, 16_500, 6_100, 8_900, 1_900, 80_000, 2_800_000],
  ['2025-12', 119_100, 38_200, 31_200, 22_400, 16_500, 8_700, 9_200, 1_900, 85_000, 2_900_000],
  ['2026-01', 124_600, 26_900, 32_800, 15_300, 16_500, 5_900, 9_200, 1_800, 90_000, 3_000_000],
  ['2026-02', 124_600, 29_400, 32_900, 13_100, 16_500, 6_300, 9_200, 1_800, 95_000, 3_100_000],
  ['2026-03', 125_300, 33_700, 33_500, 27_600, 16_500, 7_400, 9_600, 1_800, 100_000, 3_250_000],
  ['2026-04', 126_200, 30_100, 33_800, 14_200, 16_500, 6_600, 9_600, 1_700, 105_000, 3_400_000],
  ['2026-05', 126_200, 35_600, 34_100, 16_900, 16_500, 6_900, 9_600, 1_700, 110_000, 3_500_000],
  ['2026-06', 129_800, 31_200, 34_600, 24_800, 16_500, 7_800, 9_900, 1_700, 115_000, 3_650_000],
  ['2026-07', 129_800, 37_400, 35_200, 15_600, 16_500, 6_400, 9_900, 1_600, 120_000, 3_800_000],
  ['2026-08', 131_500, 40_300, 35_900, 17_200, 16_500, 7_100, 9_900, 1_600, 125_000, 3_950_000],
  ['2026-09', 131_500, 36_800, 36_400, 21_900, 16_500, 6_800, 10_200, 1_600, 130_000, 4_100_000],
  // Month in progress: budget only. Month-end P&L is not yet closed.
  ['2026-10', 0, 0, 0, 0, 0, 0, 0, 0, 135_000, 4_250_000],
];

const BUDGET_OPEX = 228_000;
const BUDGET_DA = 9_500;
const BUDGET_FIN = 1_800;

export const PNL: PnlMonth[] = ROWS.map(([month, personnel, marketing, technology, professional, premises, otherOpex, depreciation, financeCosts, bRev, bSubs]) => ({
  month,
  personnel,
  marketing,
  technology,
  professional,
  premises,
  otherOpex,
  depreciation,
  financeCosts,
  budget: {
    revenue: bRev,
    opex: BUDGET_OPEX,
    ebitda: bRev - BUDGET_OPEX,
    netResult: bRev - BUDGET_OPEX - BUDGET_DA - BUDGET_FIN,
    subscriptions: bSubs,
  },
}));

/** Latest month for which month-end P&L has been closed. */
export const LATEST_CLOSED_PNL_MONTH = '2026-09';
