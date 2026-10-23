import type { Obligation } from './types';

export const OBLIGATIONS: Obligation[] = [
  {
    id: 'OBL-01', issuerId: 'ISS-07', trancheId: 'TR-2613', title: 'Arus Marine Note 2 closing — 46% subscribed', type: 'Tranche closing', dueDate: '2026-10-27',
    owner: 'Head of Issuer Origination', supportingDept: 'Investor Operations', status: 'At risk', risk: 'Critical',
    nextAction: 'CEO decision: extend offer period, downsize issuance or close as scheduled.', latestUpdate: '22 Oct: options paper circulated to CEO.', hasDocument: true,
  },
  {
    id: 'OBL-02', issuerId: 'ISS-03', trancheId: 'TR-2610', title: 'Teratak Logistics Note 2 issuance (rescheduled)', type: 'Issuance', dueDate: '2026-10-28',
    owner: 'Head of Legal', supportingDept: 'Finance', status: 'At risk', risk: 'High',
    nextAction: 'Obtain signed CP board resolution from issuer by 26 Oct.', latestUpdate: '21 Oct: issuer counsel confirms signing meeting 24 Oct.', hasDocument: true,
  },
  {
    id: 'OBL-03', issuerId: 'ISS-06', trancheId: 'TR-2611', title: 'Kilau Halal Foods Note 2 issuance and settlement', type: 'Settlement', dueDate: '2026-10-26',
    owner: 'Head of Finance', supportingDept: 'Investor Operations', status: 'In progress', risk: 'Medium',
    nextAction: 'Release allocated funds to issuer on settlement date.', latestUpdate: '20 Oct: settlement instructions verified.', hasDocument: true,
  },
  {
    id: 'OBL-04', issuerId: 'ISS-05', trancheId: 'TR-2612', title: 'Meranti Hartanah Note 2 closing and allocation', type: 'Tranche closing', dueDate: '2026-10-30',
    owner: 'Head of Investor Operations', supportingDept: 'Finance', status: 'In progress', risk: 'Low',
    nextAction: 'Run allocation and notify investors of final amounts.', latestUpdate: '12 Oct: fully subscribed.', hasDocument: false,
  },
  {
    id: 'OBL-05', issuerId: 'ISS-01', trancheId: null, title: 'Selatan Agro Q3 management accounts', type: 'Issuer reporting', dueDate: '2026-10-15',
    owner: 'Head of Compliance', supportingDept: 'Issuer Origination', status: 'Awaiting issuer', risk: 'High',
    nextAction: 'Escalate to issuer CFO; consider formal reminder under note covenant.', latestUpdate: '20 Oct: second reminder sent. No response.', hasDocument: false,
  },
  {
    id: 'OBL-06', issuerId: 'ISS-08', trancheId: 'TR-2615', title: 'Permata EduTech Note 2 opening', type: 'Tranche opening', dueDate: '2026-11-03',
    owner: 'Head of Investor Operations', supportingDept: 'Legal', status: 'In progress', risk: 'Medium',
    nextAction: 'Finalise offering documents and investor disclosures.', latestUpdate: '19 Oct: final legal review under way.', hasDocument: true,
  },
  {
    id: 'OBL-07', issuerId: 'ISS-05', trancheId: 'TR-2602', title: 'Meranti Hartanah Note 1 principal repayment', type: 'Principal repayment', dueDate: '2026-11-18',
    owner: 'Head of Finance', supportingDept: 'Issuer Origination', status: 'In progress', risk: 'High',
    nextAction: 'Confirm sinking fund reaches 100% by 11 Nov; prepare investor notice.', latestUpdate: '22 Oct: sinking fund at 85%.', hasDocument: true,
  },
  {
    id: 'OBL-08', issuerId: 'ISS-04', trancheId: 'TR-2601', title: 'Cendana Healthcare Note 1 profit payment', type: 'Profit payment', dueDate: '2026-11-06',
    owner: 'Head of Finance', supportingDept: 'Investor Operations', status: 'Not started', risk: 'Low',
    nextAction: 'Collect profit amount from issuer 3 business days before payment date.', latestUpdate: 'Payment schedule confirmed.', hasDocument: true,
  },
  {
    id: 'OBL-09', issuerId: 'ISS-04', trancheId: null, title: 'Cendana Healthcare facility agreement renewal', type: 'Document renewal', dueDate: '2026-11-30',
    owner: 'Head of Legal', supportingDept: 'Issuer Origination', status: 'In progress', risk: 'Medium',
    nextAction: 'Review issuer counsel draft and return comments.', latestUpdate: '14 Oct: draft received.', hasDocument: true,
  },
  {
    id: 'OBL-10', issuerId: 'ISS-09', trancheId: null, title: 'Lintas Fibre post-issuance report to authority (synthetic)', type: 'Regulatory submission', dueDate: '2026-10-20',
    owner: 'Head of Compliance', supportingDept: 'Finance', status: 'In progress', risk: 'High',
    nextAction: 'Finalise and submit; record reason for late submission.', latestUpdate: '22 Oct: awaiting final sign-off from Finance.', hasDocument: true,
  },
  {
    id: 'OBL-11', issuerId: 'ISS-02', trancheId: 'TR-2604', title: 'Bayu Lestari Solar Note 2 profit payment', type: 'Profit payment', dueDate: '2026-12-15',
    owner: 'Head of Finance', supportingDept: 'Investor Operations', status: 'Not started', risk: 'Low',
    nextAction: 'No action until December collection cycle.', latestUpdate: 'Scheduled.', hasDocument: true,
  },
  {
    id: 'OBL-12', issuerId: 'ISS-07', trancheId: null, title: 'Arus Marine issuer approval expiry', type: 'Approval expiry', dueDate: '2026-12-01',
    owner: 'Head of Compliance', supportingDept: 'Issuer Origination', status: 'Not started', risk: 'Medium',
    nextAction: 'Decide whether to renew issuer eligibility given Note 2 performance.', latestUpdate: 'Linked to Note 2 outcome.', hasDocument: false,
  },
  {
    id: 'OBL-13', issuerId: 'ISS-06', trancheId: null, title: 'Kilau Halal Foods brand licence for offer materials', type: 'Brand / trademark deadline', dueDate: '2026-11-15',
    owner: 'Head of Marketing', supportingDept: 'Legal', status: 'Not started', risk: 'Low',
    nextAction: 'Request renewed brand-use consent from issuer.', latestUpdate: 'Current consent valid to 15 Nov.', hasDocument: true,
  },
  {
    id: 'OBL-14', issuerId: 'ISS-08', trancheId: null, title: 'Permata EduTech issuer application — supplementary information', type: 'Application submission', dueDate: '2026-11-10',
    owner: 'Head of Issuer Origination', supportingDept: 'Compliance', status: 'In progress', risk: 'Medium',
    nextAction: 'Submit updated cash-flow projections.', latestUpdate: '18 Oct: projections requested from issuer.', hasDocument: false,
  },
  {
    id: 'OBL-15', issuerId: 'ISS-01', trancheId: 'TR-2606', title: 'Selatan Agro Note 2 profit payment', type: 'Profit payment', dueDate: '2026-12-12',
    owner: 'Head of Finance', supportingDept: 'Investor Operations', status: 'Not started', risk: 'Medium',
    nextAction: 'Monitor given overdue Q3 accounts.', latestUpdate: '30 Sep: payment date confirmed.', hasDocument: true,
  },
  {
    id: 'OBL-16', issuerId: 'ISS-02', trancheId: null, title: 'Bayu Lestari Solar annual audited accounts', type: 'Issuer reporting', dueDate: '2026-10-05',
    owner: 'Head of Compliance', supportingDept: 'Finance', status: 'Completed', risk: 'Low',
    nextAction: 'None. Filed.', latestUpdate: '6 Oct: received and reviewed.', hasDocument: true,
  },
];
