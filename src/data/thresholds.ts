/**
 * Demo alert thresholds and investor value bands. These are illustrative prototype settings,
 * NOT official KLDX policy. Production thresholds would need to be formally agreed by KLDX.
 */
export interface Thresholds {
  trancheClosingSoonDays: number;
  trancheUnderTargetPct: number;
  trancheCriticalPct: number;
  dueSoonDays: number;
  decisionWindowDays: number;
  onboardingStaleDays: number;
  onboardingBacklogCount: number;
  highValueTopUp: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  trancheClosingSoonDays: 7,
  trancheUnderTargetPct: 75,
  trancheCriticalPct: 50,
  dueSoonDays: 7,
  decisionWindowDays: 14,
  onboardingStaleDays: 14,
  onboardingBacklogCount: 5,
  highValueTopUp: 250_000,
};

/** Lower bounds of the top three current-subscription bands (the fourth band is everything below). */
export type Bands = [number, number, number];
export const DEFAULT_BANDS: Bands = [1_000_000, 500_000, 100_000];
