/**
 * Synthetic redemption schedule. Notes of 12 months or more pay profit every six months;
 * shorter notes pay all profit with principal at maturity. Amounts are computed from the
 * tranche's successful subscriptions in lib/selectors/operations.ts so they reconcile.
 * `issuerReceived` is the share of the amount due already received from the issuer.
 */
export interface PaymentSpec {
  id: string;
  trancheId: string;
  type: 'Profit payment' | 'Principal + profit';
  dueDate: string;
  issuerReceived: number;
  /** Investors already paid; 'all' once the payment is complete. */
  investorsPaid: number | 'all';
}

export const PAYMENTS: PaymentSpec[] = [
  { id: 'PAY-08', trancheId: 'TR-2601', type: 'Profit payment', dueDate: '2026-11-06', issuerReceived: 1, investorsPaid: 0 },
  { id: 'PAY-07', trancheId: 'TR-2602', type: 'Principal + profit', dueDate: '2026-11-18', issuerReceived: 0.85, investorsPaid: 0 },
  { id: 'PAY-06', trancheId: 'TR-2606', type: 'Profit payment', dueDate: '2026-12-12', issuerReceived: 0, investorsPaid: 0 },
  { id: 'PAY-05', trancheId: 'TR-2604', type: 'Profit payment', dueDate: '2026-12-15', issuerReceived: 0, investorsPaid: 0 },
  { id: 'PAY-03', trancheId: 'TR-2503', type: 'Principal + profit', dueDate: '2026-06-17', issuerReceived: 1, investorsPaid: 'all' },
  { id: 'PAY-02', trancheId: 'TR-2502', type: 'Principal + profit', dueDate: '2026-05-19', issuerReceived: 1, investorsPaid: 'all' },
  { id: 'PAY-01', trancheId: 'TR-2501', type: 'Principal + profit', dueDate: '2026-04-22', issuerReceived: 1, investorsPaid: 'all' },
];
