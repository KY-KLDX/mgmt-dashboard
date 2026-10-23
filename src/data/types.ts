export type ISODate = string; // YYYY-MM-DD

export type Role = 'CEO' | 'Management';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Issuer {
  id: string;
  name: string;
  sector: string;
  status: 'Active' | 'Inactive';
  relationshipOwner: string;
  onboardedOn: ISODate;
  summary: string;
  updates: { date: ISODate; text: string; by: string }[];
}

export type TrancheStage =
  | 'Upcoming'
  | 'Open'
  | 'Fully Subscribed'
  | 'Closed'
  | 'Issued / Settled'
  | 'Matured';

export const TRANCHE_STAGES: TrancheStage[] = [
  'Upcoming',
  'Open',
  'Fully Subscribed',
  'Closed',
  'Issued / Settled',
  'Matured',
];

export interface Tranche {
  id: string;
  name: string;
  issuerId: string;
  instrument: string;
  openDate: ISODate;
  closeDate: ISODate;
  issueDate: ISODate;
  maturityDate: ISODate;
  tenorMonths: number;
  profitRate: number; // indicative investor profit rate p.a.
  target: number;
  /** Applicable KLDX fee rate, stored per tranche. */
  feeRate: number;
  stage: TrancheStage;
  notes: string[];
  exceptions: { date: ISODate; text: string; resolved: boolean }[];
}

export type SubscriptionStatus = 'Allocated' | 'Pending' | 'Rejected' | 'Cancelled';

export interface Subscription {
  id: string;
  investorId: string;
  trancheId: string;
  amount: number;
  requestedOn: ISODate;
  status: SubscriptionStatus;
}

export type StepStatus = 'Completed' | 'Incomplete' | 'Not started';

export type AccountStatus =
  | 'Active'
  | 'Approved'
  | 'Pending approval'
  | 'Onboarding'
  | 'Registered'
  | 'Under review';

export interface Investor {
  id: string; // anonymised ID, e.g. INV-1047
  /** Fictional display name. Only ever read through lib/identity.ts. */
  name: string;
  type: 'Individual' | 'Corporate';
  registeredOn: ISODate;
  onboardingStartedOn: ISODate | null;
  ctosCompletedOn: ISODate | null;
  kycCompletedOn: ISODate | null;
  approvedOn: ISODate | null;
  ctos: StepStatus;
  kyc: StepStatus;
  accountStatus: AccountStatus;
  issues: string[];
  lastActivity: ISODate;
}

export type TxnType = 'Top-up' | 'Withdrawal' | 'Maturity return';
export type TxnStatus = 'Successful' | 'Failed' | 'Pending' | 'Completed';

export interface Transaction {
  id: string;
  investorId: string;
  type: TxnType;
  amount: number;
  date: ISODate;
  status: TxnStatus;
  note?: string;
}

export interface PnlMonth {
  month: string; // YYYY-MM
  personnel: number;
  marketing: number;
  technology: number;
  professional: number;
  premises: number;
  otherOpex: number;
  depreciation: number;
  financeCosts: number;
  budget: {
    revenue: number;
    opex: number;
    ebitda: number;
    netResult: number;
    subscriptions: number;
  };
}

export type ObligationType =
  | 'Tranche opening'
  | 'Tranche closing'
  | 'Issuance'
  | 'Settlement'
  | 'Profit payment'
  | 'Principal repayment'
  | 'Issuer reporting'
  | 'Document renewal'
  | 'Application submission'
  | 'Regulatory submission'
  | 'Approval expiry'
  | 'Brand / trademark deadline';

export type ObligationStatus = 'Not started' | 'In progress' | 'At risk' | 'Completed' | 'Awaiting issuer';

export interface Obligation {
  id: string;
  issuerId: string;
  trancheId: string | null;
  title: string;
  type: ObligationType;
  dueDate: ISODate;
  owner: string;
  supportingDept: string;
  status: ObligationStatus;
  risk: RiskLevel;
  nextAction: string;
  latestUpdate: string;
  hasDocument: boolean;
}

export type IncidentCategory =
  | 'Availability'
  | 'Cybersecurity'
  | 'Data'
  | 'Third-party service'
  | 'Application defect'
  | 'Infrastructure'
  | 'Access control'
  | 'Change failure';

export type IncidentStatus = 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved' | 'Closed';

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  service: string;
  businessImpact: string;
  investorImpact: string;
  detectedAt: string; // ISO datetime
  status: IncidentStatus;
  owner: string;
  targetResolution: ISODate;
  regulatoryAssessment: 'Not required' | 'Assessment pending' | 'Assessed — not reportable' | 'Notification prepared';
  decisionRequired: string | null;
  containment: string;
  progress: number;
  systems: string[];
  actions: { text: string; owner: string; due: ISODate; done: boolean }[];
  timeline: { at: string; text: string }[];
  pirStatus: 'Not started' | 'Scheduled' | 'Completed' | 'Not required';
  summary: string;
}

export type Trend = 'Improving' | 'Stable' | 'Worsening';

export interface CyberRisk {
  id: string;
  title: string;
  description: string;
  area: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  controls: string;
  treatment: string;
  owner: string;
  targetDate: ISODate;
  treatmentComplete: boolean;
  residual: RiskLevel;
  trend: Trend;
}

export interface ResilienceMeasure {
  id: string;
  label: string;
  value: string;
  target: string;
  status: 'On track' | 'Attention' | 'Overdue' | 'Failed';
  note: string;
}

export interface ServiceAvailability {
  service: string;
  availability: number; // % for last 30 days
  target: number;
}

export type GovBody = 'CEO' | 'Senior Management Team' | 'Board' | 'Department owner' | 'External authority';

export type GovActionType =
  | 'For Information'
  | 'Review'
  | 'Endorsement'
  | 'Approval'
  | 'Decision'
  | 'Acknowledgement'
  | 'Submission'
  | 'Update Required';

export type GovStage =
  | 'Drafting'
  | 'Internal Review'
  | 'Management Review'
  | 'Ready for Submission'
  | 'Submitted'
  | 'Approved'
  | 'Endorsed'
  | 'Noted'
  | 'Rejected'
  | 'Closed';

export const GOV_WORKFLOW: GovStage[] = [
  'Drafting',
  'Internal Review',
  'Management Review',
  'Ready for Submission',
  'Submitted',
  'Approved',
  'Closed',
];

export const GOV_OUTCOMES: GovStage[] = ['Approved', 'Endorsed', 'Noted', 'Rejected'];

export type GovCategory =
  | 'Policy and procedure'
  | 'Regulatory application'
  | 'Regulatory submission'
  | 'Board paper'
  | 'Management paper'
  | 'Risk acceptance'
  | 'Technology or cybersecurity update'
  | 'Audit and compliance action'
  | 'Brand or trademark matter'
  | 'Contract or legal matter'
  | 'Issuer matter'
  | 'Strategic initiative';

export type Priority = 'High' | 'Medium' | 'Low';

export interface GovActivity {
  at: string; // ISO datetime
  by: string;
  text: string;
}

export interface PolicyMeta {
  version: string;
  lastReview: ISODate;
  nextReview: ISODate;
  proposedChanges: string;
  requirementRef: string;
}

export interface ApplicationMeta {
  applicationType: string;
  authority: string;
  missingInfo: string | null;
  approvalRequired: 'Management' | 'Board' | 'Management and Board' | 'None';
}

export interface GovItem {
  id: string;
  title: string;
  category: GovCategory;
  body: GovBody;
  actionType: GovActionType;
  owner: string;
  supportingDept: string;
  targetDate: ISODate; // meeting / submission date
  prepDeadline: ISODate;
  stage: GovStage;
  /** Stages this item will not pass through, e.g. a CEO update that skips Board submission. */
  skips: GovStage[];
  priority: Priority;
  readiness: number;
  latestUpdate: string;
  blocker: string | null;
  nextAction: string;
  documentLink: string | null;
  dependencies: string[];
  boardMeeting: string | null; // label of intended Board meeting / circulation
  completedOn: ISODate | null;
  issuerId?: string;
  /** Alert id this item is the decision for; the governance alert is suppressed when that alert is open. */
  relatedAlert?: string;
  policy?: PolicyMeta;
  application?: ApplicationMeta;
  activity: GovActivity[];
}
