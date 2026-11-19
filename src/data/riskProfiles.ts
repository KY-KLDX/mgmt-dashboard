/**
 * Synthetic AML/CDD risk profile per investor. Illustrative only: the factors, weights and
 * thresholds are prototype assumptions, not KLDX's customer risk methodology, which
 * Compliance would own.
 */
export type RiskFactor = 'PEP connection' | 'High-risk jurisdiction' | 'Source of funds unclear' | 'Complex ownership';
export type RiskLevel3 = 'Low' | 'Medium' | 'High';

export interface RiskProfile {
  investorId: string;
  factors: RiskFactor[];
  level: RiskLevel3;
  /** High-risk profiles need an enhanced due-diligence review before they are cleared. */
  review: 'Not required' | 'Pending review' | 'Cleared';
  reviewedOn: string | null;
}

const WEIGHT: Record<RiskFactor, number> = {
  'PEP connection': 2,
  'High-risk jurisdiction': 2,
  'Source of funds unclear': 1,
  'Complex ownership': 1,
};

const FACTORS: Record<string, RiskFactor[]> = {
  // High (score 3 or more, or any 2-weight factor plus another)
  'INV-1007': ['Complex ownership', 'Source of funds unclear', 'High-risk jurisdiction'],
  'INV-1023': ['PEP connection', 'Complex ownership'],
  'INV-1013': ['High-risk jurisdiction', 'Source of funds unclear'],
  'INV-1155': ['Complex ownership', 'High-risk jurisdiction'],
  'INV-1127': ['PEP connection', 'Source of funds unclear'],
  // Medium (score 1–2)
  'INV-1001': ['Complex ownership'],
  'INV-1017': ['Complex ownership'],
  'INV-1035': ['Complex ownership'],
  'INV-1049': ['Complex ownership'],
  'INV-1005': ['PEP connection'],
  'INV-1059': ['Source of funds unclear'],
  'INV-1083': ['Source of funds unclear'],
  'INV-1133': ['Source of funds unclear'],
  'INV-1125': ['Source of funds unclear'],
  'INV-1145': ['High-risk jurisdiction'],
  'INV-1011': ['Source of funds unclear'],
  'INV-1067': ['Source of funds unclear'],
};

const CLEARED: Record<string, string> = { 'INV-1023': '2026-09-18' };

export function scoreOf(factors: RiskFactor[]): number {
  return factors.reduce((a, f) => a + WEIGHT[f], 0);
}

export function levelOf(factors: RiskFactor[]): RiskLevel3 {
  const s = scoreOf(factors);
  return s >= 3 ? 'High' : s >= 1 ? 'Medium' : 'Low';
}

export function riskProfileFor(investorId: string): RiskProfile {
  const factors = FACTORS[investorId] ?? [];
  const level = levelOf(factors);
  const cleared = CLEARED[investorId] ?? null;
  return {
    investorId, factors, level,
    review: level !== 'High' ? 'Not required' : cleared ? 'Cleared' : 'Pending review',
    reviewedOn: cleared,
  };
}
