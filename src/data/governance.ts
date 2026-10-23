import type { GovItem } from './types';

const BM_NOV = 'Board Meeting · 12 Nov 2026';
const BC_OCT = 'Board Circular · 30 Oct 2026';
const BM_DEC = 'Board Meeting · 10 Dec 2026';

export const BOARD_DATES: Record<string, string> = {
  [BC_OCT]: '2026-10-30',
  [BM_NOV]: '2026-11-12',
  [BM_DEC]: '2026-12-10',
};

const act = (at: string, by: string, text: string) => ({ at, by, text });

export const GOVERNANCE: GovItem[] = [
  {
    id: 'GOV-101', title: 'Q3 2026 Management Accounts and Business Update', category: 'Board paper', body: 'Board', actionType: 'For Information',
    owner: 'Head of Finance', supportingDept: 'Finance', targetDate: '2026-11-12', prepDeadline: '2026-11-02', stage: 'Internal Review', skips: [],
    priority: 'High', readiness: 60, latestUpdate: 'Draft P&L commentary prepared; awaiting September close sign-off.', blocker: null,
    nextAction: 'CEO review of business update section by 29 Oct.', documentLink: 'demo://papers/q3-mgmt-accounts-v2', dependencies: [], boardMeeting: BM_NOV, completedOn: null,
    activity: [act('2026-10-15T10:00:00+08:00', 'Head of Finance', 'Draft v1 created.'), act('2026-10-21T16:20:00+08:00', 'Head of Finance', 'Draft v2 with September figures.')],
  },
  {
    id: 'GOV-102', title: 'Payment Channel Resilience: Secondary Gateway Proposal', category: 'Technology or cybersecurity update', body: 'Board', actionType: 'Approval',
    owner: 'Chief Technology Officer', supportingDept: 'Technology', targetDate: '2026-11-12', prepDeadline: '2026-10-29', stage: 'Drafting', skips: [],
    priority: 'High', readiness: 25, latestUpdate: 'Vendor quotes outstanding. Linked to incident INC-2611 and risk CR-01.',
    blocker: 'Two vendor quotes not yet received; cost case cannot be completed.', nextAction: 'Chase vendor quotes; SMT review on 4 Nov.',
    documentLink: null, dependencies: ['Vendor quotes', 'SMT endorsement'], boardMeeting: BM_NOV, completedOn: null,
    activity: [act('2026-10-12T09:30:00+08:00', 'Chief Technology Officer', 'Paper outline agreed with CEO.')],
  },
  {
    id: 'GOV-103', title: 'Board Risk Appetite Statement — annual refresh', category: 'Policy and procedure', body: 'Board', actionType: 'Approval',
    owner: 'Head of Risk', supportingDept: 'Risk', targetDate: '2026-11-12', prepDeadline: '2026-10-20', stage: 'Management Review', skips: [],
    priority: 'High', readiness: 70, latestUpdate: 'Management review comments outstanding from two department heads.',
    blocker: 'Awaiting comments from Technology and Investor Operations.', nextAction: 'Collect outstanding comments; finalise for Board pack.',
    documentLink: 'demo://policies/risk-appetite-2026-draft', dependencies: ['Technology comments', 'Investor Operations comments'], boardMeeting: BM_NOV, completedOn: null,
    policy: { version: 'v2.0 → v3.0 (draft)', lastReview: '2025-11-13', nextReview: '2026-11-12', proposedChanges: 'Adds investor concentration limit and technology availability tolerance.', requirementRef: 'Requirement reference: to be confirmed' },
    activity: [act('2026-10-02T11:00:00+08:00', 'Head of Risk', 'Draft circulated for management review.')],
  },
  {
    id: 'GOV-104', title: 'Arus Marine Note 2: extend, downsize or close', category: 'Issuer matter', body: 'CEO', actionType: 'Decision',
    owner: 'Head of Issuer Origination', supportingDept: 'Issuer Origination', targetDate: '2026-10-24', prepDeadline: '2026-10-22', stage: 'Management Review', skips: ['Ready for Submission', 'Submitted'],
    priority: 'High', readiness: 90, latestUpdate: 'Options paper with issuer preference circulated 22 Oct.', blocker: null,
    nextAction: 'CEO decision required before 27 Oct close.', documentLink: 'demo://papers/arus-note2-options', dependencies: [], boardMeeting: null, completedOn: null, issuerId: 'ISS-07', relatedAlert: 'AL-TR-2613',
    activity: [act('2026-10-22T17:45:00+08:00', 'Head of Issuer Origination', 'Options paper sent to CEO.')],
  },
  {
    id: 'GOV-105', title: 'Activate secondary payment channel during INC-2611', category: 'Risk acceptance', body: 'CEO', actionType: 'Decision',
    owner: 'Chief Technology Officer', supportingDept: 'Finance', targetDate: '2026-10-24', prepDeadline: '2026-10-23', stage: 'Management Review', skips: ['Ready for Submission', 'Submitted'],
    priority: 'High', readiness: 80, latestUpdate: 'Cost impact estimated at RM 6,800 per week in additional fees.', blocker: null,
    nextAction: 'CEO to accept higher fees or accept continued top-up failures.', documentLink: null, dependencies: [], boardMeeting: null, completedOn: null, relatedAlert: 'AL-INC-2611',
    activity: [act('2026-10-22T12:00:00+08:00', 'Chief Technology Officer', 'Decision request raised.')],
  },
  {
    id: 'GOV-106', title: 'Anti-Money Laundering and CFT Policy review', category: 'Policy and procedure', body: 'Board', actionType: 'Approval',
    owner: 'Head of Compliance', supportingDept: 'Compliance', targetDate: '2026-10-30', prepDeadline: '2026-10-16', stage: 'Internal Review', skips: [],
    priority: 'High', readiness: 45, latestUpdate: 'Preparation deadline missed. Source-of-funds section being redrafted.',
    blocker: 'External counsel comments not received.', nextAction: 'Decide whether to defer to 12 Nov Board meeting.',
    documentLink: 'demo://policies/aml-cft-v4-draft', dependencies: ['External counsel review'], boardMeeting: BC_OCT, completedOn: null,
    policy: { version: 'v3.1', lastReview: '2025-10-28', nextReview: '2026-10-28', proposedChanges: 'Strengthens source-of-funds checks for top-ups above RM 250,000.', requirementRef: 'Requirement reference: to be confirmed' },
    activity: [act('2026-10-01T09:00:00+08:00', 'Head of Compliance', 'Review started.'), act('2026-10-17T15:00:00+08:00', 'Head of Compliance', 'Internal preparation deadline missed.')],
  },
  {
    id: 'GOV-107', title: 'Information Security Policy annual review', category: 'Policy and procedure', body: 'Senior Management Team', actionType: 'Endorsement',
    owner: 'Head of Information Security', supportingDept: 'Technology', targetDate: '2026-10-15', prepDeadline: '2026-10-08', stage: 'Drafting', skips: [],
    priority: 'Medium', readiness: 35, latestUpdate: 'Overdue. Redraft incorporating mandatory 2FA position.', blocker: null,
    nextAction: 'Submit revised draft to SMT meeting on 4 Nov.', documentLink: null, dependencies: [], boardMeeting: null, completedOn: null,
    policy: { version: 'v2.3', lastReview: '2025-10-10', nextReview: '2026-10-15', proposedChanges: 'Adds mandatory 2FA, contractor offboarding and cloud guardrails.', requirementRef: 'Requirement reference: to be confirmed' },
    activity: [act('2026-10-09T10:00:00+08:00', 'Head of Information Security', 'Scope expanded after INC-2601.')],
  },
  {
    id: 'GOV-108', title: 'Complaints Handling Procedure review', category: 'Policy and procedure', body: 'Senior Management Team', actionType: 'Approval',
    owner: 'Head of Investor Operations', supportingDept: 'Investor Operations', targetDate: '2026-11-25', prepDeadline: '2026-11-18', stage: 'Drafting', skips: [],
    priority: 'Low', readiness: 20, latestUpdate: 'Review scheduled.', blocker: null, nextAction: 'Draft updates.', documentLink: null, dependencies: [], boardMeeting: null, completedOn: null,
    policy: { version: 'v1.4', lastReview: '2025-11-20', nextReview: '2026-11-25', proposedChanges: 'Align turnaround times with new support tooling.', requirementRef: 'Requirement reference: to be confirmed' },
    activity: [],
  },
  {
    id: 'GOV-109', title: 'Business Continuity Plan review', category: 'Policy and procedure', body: 'Board', actionType: 'Approval',
    owner: 'Chief Technology Officer', supportingDept: 'Risk', targetDate: '2026-12-10', prepDeadline: '2026-11-26', stage: 'Drafting', skips: [],
    priority: 'Medium', readiness: 15, latestUpdate: 'Depends on outcome of failed September recovery test.', blocker: 'Recovery re-test not yet scheduled.',
    nextAction: 'Schedule recovery re-test before 20 Nov.', documentLink: null, dependencies: ['Recovery re-test'], boardMeeting: BM_DEC, completedOn: null,
    policy: { version: 'v2.0', lastReview: '2025-12-11', nextReview: '2026-12-10', proposedChanges: 'Update recovery objectives and payment-channel fallback.', requirementRef: 'Requirement reference: to be confirmed' },
    activity: [],
  },
  {
    id: 'GOV-110', title: 'Application: new product category approval (synthetic)', category: 'Regulatory application', body: 'External authority', actionType: 'Submission',
    owner: 'Head of Compliance', supportingDept: 'Legal', targetDate: '2026-11-06', prepDeadline: '2026-10-30', stage: 'Internal Review', skips: [],
    priority: 'High', readiness: 55, latestUpdate: 'Draft application 70% complete; Board approval needed before submission.',
    blocker: 'Board approval required before submission.', nextAction: 'Include in 30 Oct Board circular for approval to submit.',
    documentLink: 'demo://applications/product-category', dependencies: ['Board approval', 'Financial projections'], boardMeeting: BC_OCT, completedOn: null,
    application: { applicationType: 'Product approval', authority: 'Regulator (synthetic placeholder)', missingInfo: 'Three-year financial projections; technology risk assessment.', approvalRequired: 'Board' },
    activity: [act('2026-10-10T14:00:00+08:00', 'Head of Compliance', 'Application drafting started.')],
  },
  {
    id: 'GOV-111', title: 'Application: payment services licence variation (synthetic)', category: 'Regulatory application', body: 'External authority', actionType: 'Submission',
    owner: 'Head of Finance', supportingDept: 'Compliance', targetDate: '2026-10-21', prepDeadline: '2026-10-14', stage: 'Ready for Submission', skips: [],
    priority: 'High', readiness: 85, latestUpdate: 'Overdue: CEO signature on cover letter outstanding.', blocker: 'CEO signature outstanding.',
    nextAction: 'CEO to sign cover letter; submit same day.', documentLink: 'demo://applications/psl-variation', dependencies: ['CEO signature'], boardMeeting: null, completedOn: null,
    application: { applicationType: 'Licence variation', authority: 'Authority (synthetic placeholder)', missingInfo: null, approvalRequired: 'Management' },
    activity: [act('2026-10-14T18:00:00+08:00', 'Head of Finance', 'Pack complete; sent for CEO signature.')],
  },
  {
    id: 'GOV-112', title: 'Trademark renewal: platform word mark (synthetic)', category: 'Brand or trademark matter', body: 'External authority', actionType: 'Submission',
    owner: 'Head of Legal', supportingDept: 'Marketing', targetDate: '2026-11-20', prepDeadline: '2026-11-13', stage: 'Drafting', skips: [],
    priority: 'Medium', readiness: 30, latestUpdate: 'Renewal forms prepared by agent.', blocker: null, nextAction: 'Approve agent fee and filing.', documentLink: null, dependencies: [], boardMeeting: null, completedOn: null,
    application: { applicationType: 'Trademark renewal', authority: 'IP office (synthetic placeholder)', missingInfo: 'Proof of use samples.', approvalRequired: 'None' },
    activity: [],
  },
  {
    id: 'GOV-113', title: 'Investor concentration limit — management paper', category: 'Management paper', body: 'Senior Management Team', actionType: 'Decision',
    owner: 'Head of Risk', supportingDept: 'Finance', targetDate: '2026-11-04', prepDeadline: '2026-10-30', stage: 'Drafting', skips: ['Ready for Submission', 'Submitted'],
    priority: 'Medium', readiness: 40, latestUpdate: 'Analysis shows top 9 investors hold most current subscriptions.', blocker: null,
    nextAction: 'Propose soft limit and monitoring trigger.', documentLink: null, dependencies: [], boardMeeting: null, completedOn: null,
    activity: [act('2026-10-18T10:00:00+08:00', 'Head of Risk', 'Data extract completed.')],
  },
  {
    id: 'GOV-114', title: 'Internal audit: IT general controls — management responses', category: 'Audit and compliance action', body: 'Department owner', actionType: 'Update Required',
    owner: 'Chief Technology Officer', supportingDept: 'Risk', targetDate: '2026-10-10', prepDeadline: '2026-10-03', stage: 'Internal Review', skips: [],
    priority: 'High', readiness: 50, latestUpdate: 'Overdue. 2 of 5 high-risk responses submitted.', blocker: 'Owner capacity during incident response.',
    nextAction: 'Submit remaining 3 responses with target dates.', documentLink: 'demo://audit/itgc-2026', dependencies: [], boardMeeting: null, completedOn: null,
    activity: [act('2026-10-10T17:00:00+08:00', 'Head of Risk', 'Deadline passed; escalated to CEO.')],
  },
  {
    id: 'GOV-115', title: '2027 Budget and Business Plan', category: 'Strategic initiative', body: 'Board', actionType: 'Approval',
    owner: 'Head of Finance', supportingDept: 'All departments', targetDate: '2026-12-10', prepDeadline: '2026-11-25', stage: 'Drafting', skips: [],
    priority: 'High', readiness: 30, latestUpdate: 'Department submissions 6 of 9 received.', blocker: null,
    nextAction: 'Remaining department submissions by 30 Oct.', documentLink: null, dependencies: ['Department submissions'], boardMeeting: BM_DEC, completedOn: null,
    activity: [act('2026-10-05T09:00:00+08:00', 'Head of Finance', 'Budget templates issued.')],
  },
  {
    id: 'GOV-116', title: 'Board Technology & Cyber Risk update (Q3)', category: 'Technology or cybersecurity update', body: 'Board', actionType: 'For Information',
    owner: 'Chief Technology Officer', supportingDept: 'Technology', targetDate: '2026-11-12', prepDeadline: '2026-11-02', stage: 'Drafting', skips: [],
    priority: 'Medium', readiness: 35, latestUpdate: 'Will include INC-2611 and INC-2609.', blocker: null, nextAction: 'Draft by 30 Oct.', documentLink: null,
    dependencies: ['INC-2611 post-incident review'], boardMeeting: BM_NOV, completedOn: null, activity: [],
  },
  {
    id: 'GOV-117', title: 'Vendor contract renewal: eKYC provider', category: 'Contract or legal matter', body: 'CEO', actionType: 'Approval',
    owner: 'Head of Legal', supportingDept: 'Investor Operations', targetDate: '2026-11-15', prepDeadline: '2026-11-08', stage: 'Internal Review', skips: ['Ready for Submission', 'Submitted'],
    priority: 'Medium', readiness: 55, latestUpdate: 'Negotiating service credits after backlog (INC-2603).', blocker: null,
    nextAction: 'Agree revised SLA terms.', documentLink: 'demo://contracts/ekyc-renewal', dependencies: [], boardMeeting: null, completedOn: null, activity: [],
  },
  {
    id: 'GOV-118', title: 'Board minutes: Q2 meeting — matters arising', category: 'Board paper', body: 'Board', actionType: 'Acknowledgement',
    owner: 'Company Secretary', supportingDept: 'Corporate Secretarial', targetDate: '2026-10-30', prepDeadline: '2026-10-23', stage: 'Ready for Submission', skips: [],
    priority: 'Low', readiness: 100, latestUpdate: 'Ready for circulation.', blocker: null, nextAction: 'Circulate with Board circular.',
    documentLink: 'demo://board/q2-matters-arising', dependencies: [], boardMeeting: BC_OCT, completedOn: null, activity: [],
  },
  {
    id: 'GOV-119', title: 'Marketing campaign approval: Q4 investor acquisition', category: 'Management paper', body: 'CEO', actionType: 'Approval',
    owner: 'Head of Marketing', supportingDept: 'Compliance', targetDate: '2026-10-10', prepDeadline: '2026-10-06', stage: 'Approved', skips: ['Ready for Submission', 'Submitted'],
    priority: 'Medium', readiness: 100, latestUpdate: 'Approved by CEO on 8 Oct with compliance conditions.', blocker: null,
    nextAction: 'None.', documentLink: 'demo://papers/q4-campaign', dependencies: [], boardMeeting: null, completedOn: '2026-10-08',
    activity: [act('2026-10-08T11:00:00+08:00', 'CEO', 'Approved with conditions.')],
  },
  {
    id: 'GOV-120', title: 'Outsourcing Policy review', category: 'Policy and procedure', body: 'Board', actionType: 'Approval',
    owner: 'Head of Risk', supportingDept: 'Legal', targetDate: '2026-09-17', prepDeadline: '2026-09-03', stage: 'Closed', skips: [],
    priority: 'Medium', readiness: 100, latestUpdate: 'Approved by Board 17 Sep. Published.', blocker: null, nextAction: 'None.',
    documentLink: 'demo://policies/outsourcing-v2', dependencies: [], boardMeeting: null, completedOn: '2026-09-17',
    policy: { version: 'v2.0', lastReview: '2026-09-17', nextReview: '2027-09-17', proposedChanges: '—', requirementRef: 'Requirement reference: to be confirmed' },
    activity: [act('2026-09-17T15:00:00+08:00', 'Company Secretary', 'Board approval recorded.')],
  },
  {
    id: 'GOV-121', title: 'Quarterly regulatory return Q3 (synthetic)', category: 'Regulatory submission', body: 'External authority', actionType: 'Submission',
    owner: 'Head of Compliance', supportingDept: 'Finance', targetDate: '2026-10-15', prepDeadline: '2026-10-10', stage: 'Closed', skips: [],
    priority: 'High', readiness: 100, latestUpdate: 'Submitted on time 14 Oct.', blocker: null, nextAction: 'None.',
    documentLink: 'demo://submissions/q3-return', dependencies: [], boardMeeting: null, completedOn: '2026-10-14',
    activity: [act('2026-10-14T16:30:00+08:00', 'Head of Compliance', 'Submitted.')],
  },
  {
    id: 'GOV-122', title: 'CEO operational update: onboarding backlog actions', category: 'Management paper', body: 'Senior Management Team', actionType: 'For Information',
    owner: 'Head of Investor Operations', supportingDept: 'Investor Operations', targetDate: '2026-10-28', prepDeadline: '2026-10-27', stage: 'Internal Review', skips: ['Ready for Submission', 'Submitted'],
    priority: 'Medium', readiness: 65, latestUpdate: 'Covers CTOS and KYC incomplete cases and vendor backlog.', blocker: null,
    nextAction: 'Present at SMT meeting 28 Oct.', documentLink: null, dependencies: [], boardMeeting: null, completedOn: null, activity: [],
  },
];
