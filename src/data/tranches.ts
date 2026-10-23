import { addDays, addMonths } from './asOf';
import type { Tranche, TrancheStage } from './types';

interface Spec {
  id: string;
  name: string;
  issuerId: string;
  open: string;
  close: string;
  tenor: number;
  fee: number;
  profit: number;
  target: number;
  /** Planned fulfilment used by the generator to size subscriptions. */
  fill: number;
  stage: TrancheStage;
  issueLag?: number;
  notes?: string[];
  exceptions?: Tranche['exceptions'];
}

const SPECS: Spec[] = [
  { id: 'TR-2501', name: 'Selatan Agro Note 1', issuerId: 'ISS-01', open: '2025-09-29', close: '2025-10-17', tenor: 6, fee: 0.03, profit: 0.085, target: 2_500_000, fill: 0.92, stage: 'Matured' },
  { id: 'TR-2502', name: 'Bayu Lestari Solar Note 1', issuerId: 'ISS-02', open: '2025-10-27', close: '2025-11-14', tenor: 6, fee: 0.035, profit: 0.09, target: 3_000_000, fill: 0.97, stage: 'Matured' },
  { id: 'TR-2503', name: 'Teratak Logistics Note 1', issuerId: 'ISS-03', open: '2025-11-24', close: '2025-12-12', tenor: 6, fee: 0.0275, profit: 0.08, target: 2_000_000, fill: 1.0, stage: 'Matured' },
  { id: 'TR-2601', name: 'Cendana Healthcare Note 1', issuerId: 'ISS-04', open: '2026-01-05', close: '2026-01-23', tenor: 12, fee: 0.0325, profit: 0.088, target: 3_500_000, fill: 0.88, stage: 'Issued / Settled' },
  {
    id: 'TR-2602', name: 'Meranti Hartanah Note 1', issuerId: 'ISS-05', open: '2026-01-26', close: '2026-02-13', tenor: 9, fee: 0.04, profit: 0.1, target: 4_000_000, fill: 0.95, stage: 'Issued / Settled',
    notes: ['Principal repayment due 18 Nov 2026. Issuer sinking fund at 85% as at 22 Oct.'],
  },
  { id: 'TR-2603', name: 'Kilau Halal Foods Note 1', issuerId: 'ISS-06', open: '2026-02-23', close: '2026-03-13', tenor: 12, fee: 0.03, profit: 0.085, target: 3_000_000, fill: 1.0, stage: 'Issued / Settled' },
  { id: 'TR-2604', name: 'Bayu Lestari Solar Note 2', issuerId: 'ISS-02', open: '2026-03-23', close: '2026-04-10', tenor: 12, fee: 0.035, profit: 0.09, target: 4_000_000, fill: 0.96, stage: 'Issued / Settled' },
  {
    id: 'TR-2605', name: 'Arus Marine Note 1', issuerId: 'ISS-07', open: '2026-04-27', close: '2026-05-15', tenor: 12, fee: 0.0425, profit: 0.105, target: 3_500_000, fill: 0.74, stage: 'Issued / Settled',
    exceptions: [{ date: '2026-05-15', text: 'Closed at 74% of target; issuer accepted reduced issuance size.', resolved: true }],
  },
  { id: 'TR-2606', name: 'Selatan Agro Note 2', issuerId: 'ISS-01', open: '2026-05-25', close: '2026-06-12', tenor: 12, fee: 0.03, profit: 0.085, target: 4_000_000, fill: 1.0, stage: 'Issued / Settled' },
  { id: 'TR-2607', name: 'Permata EduTech Note 1', issuerId: 'ISS-08', open: '2026-06-22', close: '2026-07-10', tenor: 12, fee: 0.0375, profit: 0.095, target: 3_000_000, fill: 0.9, stage: 'Issued / Settled' },
  { id: 'TR-2608', name: 'Lintas Fibre Note 1', issuerId: 'ISS-09', open: '2026-07-27', close: '2026-08-14', tenor: 18, fee: 0.025, profit: 0.078, target: 5_000_000, fill: 0.98, stage: 'Issued / Settled' },
  { id: 'TR-2609', name: 'Cendana Healthcare Note 2', issuerId: 'ISS-04', open: '2026-08-24', close: '2026-09-11', tenor: 12, fee: 0.0325, profit: 0.088, target: 4_500_000, fill: 1.0, stage: 'Issued / Settled' },
  {
    id: 'TR-2610', name: 'Teratak Logistics Note 2', issuerId: 'ISS-03', open: '2026-09-14', close: '2026-10-02', tenor: 12, fee: 0.0275, profit: 0.08, target: 4_000_000, fill: 0.93, stage: 'Closed', issueLag: 26,
    notes: ['Allocation completed 2 Oct. Issuance awaiting issuer conditions-precedent documents.'],
    exceptions: [{ date: '2026-10-21', text: 'Issuance date slipped from 9 Oct to 28 Oct: CP board resolution outstanding.', resolved: false }],
  },
  { id: 'TR-2611', name: 'Kilau Halal Foods Note 2', issuerId: 'ISS-06', open: '2026-09-28', close: '2026-10-16', tenor: 12, fee: 0.03, profit: 0.085, target: 3_500_000, fill: 0.99, stage: 'Closed', issueLag: 10 },
  {
    id: 'TR-2612', name: 'Meranti Hartanah Note 2', issuerId: 'ISS-05', open: '2026-10-05', close: '2026-10-30', tenor: 12, fee: 0.04, profit: 0.1, target: 5_000_000, fill: 1.01, stage: 'Fully Subscribed',
    notes: ['Full subscription reached 12 Oct. Requests remain pending until allocation at close.'],
  },
  {
    id: 'TR-2613', name: 'Arus Marine Note 2', issuerId: 'ISS-07', open: '2026-10-07', close: '2026-10-27', tenor: 12, fee: 0.0425, profit: 0.105, target: 4_000_000, fill: 0.46, stage: 'Open',
    exceptions: [{ date: '2026-10-20', text: 'Subscription pace below plan for second consecutive week.', resolved: false }],
  },
  { id: 'TR-2614', name: 'Lintas Fibre Note 2', issuerId: 'ISS-09', open: '2026-10-19', close: '2026-11-13', tenor: 18, fee: 0.025, profit: 0.078, target: 6_000_000, fill: 0.31, stage: 'Open' },
  { id: 'TR-2615', name: 'Permata EduTech Note 2', issuerId: 'ISS-08', open: '2026-11-03', close: '2026-11-20', tenor: 12, fee: 0.0375, profit: 0.095, target: 3_000_000, fill: 0, stage: 'Upcoming' },
];

export const TRANCHE_FILL: Record<string, number> = Object.fromEntries(SPECS.map((s) => [s.id, s.fill]));

export const TRANCHES: Tranche[] = SPECS.map((s) => {
  const issueDate = addDays(s.close, s.issueLag ?? 5);
  return {
    id: s.id,
    name: s.name,
    issuerId: s.issuerId,
    instrument: 'Investment note',
    openDate: s.open,
    closeDate: s.close,
    issueDate,
    maturityDate: addMonths(issueDate, s.tenor),
    tenorMonths: s.tenor,
    profitRate: s.profit,
    target: s.target,
    feeRate: s.fee,
    stage: s.stage,
    notes: s.notes ?? [],
    exceptions: s.exceptions ?? [],
  };
});
