import type { CyberRisk, Incident, ResilienceMeasure, ServiceAvailability } from './types';

// Synthetic executive-level technology and cyber data. Not a security operations feed
// and not a regulatory compliance assessment.

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-2611', title: 'Investor wallet top-ups failing intermittently via payment gateway', category: 'Third-party service', severity: 'Critical',
    service: 'Wallet top-up', businessImpact: 'About 18% of top-up attempts failing since 21 Oct; risk to Arus Marine Note 2 and Lintas Fibre Note 2 subscriptions.',
    investorImpact: 'Investors see "payment could not be completed" and may retry several times.', detectedAt: '2026-10-21T10:42:00+08:00',
    status: 'Investigating', owner: 'Chief Technology Officer', targetResolution: '2026-10-24', regulatoryAssessment: 'Assessment pending',
    decisionRequired: 'Approve temporary switch to secondary payment channel (higher fees) until gateway issue resolved.',
    containment: 'Partial — retry throttling enabled; secondary channel ready but not switched on.', progress: 40,
    systems: ['Payment gateway integration', 'Wallet service', 'Investor notifications'],
    actions: [
      { text: 'Joint call with payment gateway provider', owner: 'Chief Technology Officer', due: '2026-10-23', done: true },
      { text: 'Prepare investor communication', owner: 'Head of Marketing', due: '2026-10-23', done: false },
      { text: 'Decide on secondary channel activation', owner: 'CEO', due: '2026-10-24', done: false },
    ],
    timeline: [
      { at: '2026-10-21T10:42:00+08:00', text: 'Spike in failed top-ups detected by monitoring.' },
      { at: '2026-10-21T13:10:00+08:00', text: 'Provider acknowledged degradation on their side.' },
      { at: '2026-10-22T09:00:00+08:00', text: 'Retry throttling enabled to reduce duplicate attempts.' },
    ],
    pirStatus: 'Not started',
    summary: 'A third-party payment gateway is intermittently rejecting top-up requests. Investor funding during two open tranches is affected.',
  },
  {
    id: 'INC-2609', title: 'Suspicious login attempts against investor accounts (credential stuffing)', category: 'Cybersecurity', severity: 'High',
    service: 'Investor login', businessImpact: 'No confirmed account takeover. 3 accounts locked as a precaution.',
    investorImpact: '3 investors asked to reset passwords.', detectedAt: '2026-10-18T22:15:00+08:00',
    status: 'Contained', owner: 'Head of Information Security', targetResolution: '2026-10-25', regulatoryAssessment: 'Assessed — not reportable',
    decisionRequired: 'Endorse mandatory two-factor authentication for all investors from 1 Dec.',
    containment: 'Contained — rate limiting and IP blocking in place.', progress: 75,
    systems: ['Investor portal', 'Identity provider'],
    actions: [
      { text: 'Force reset on affected accounts', owner: 'Head of Information Security', due: '2026-10-19', done: true },
      { text: 'Paper on mandatory 2FA to SMT', owner: 'Head of Information Security', due: '2026-10-28', done: false },
    ],
    timeline: [
      { at: '2026-10-18T22:15:00+08:00', text: 'Unusual login failure volume detected.' },
      { at: '2026-10-18T23:40:00+08:00', text: 'Rate limits tightened; source IP ranges blocked.' },
      { at: '2026-10-19T10:00:00+08:00', text: 'Affected investors contacted.' },
    ],
    pirStatus: 'Scheduled',
    summary: 'Automated login attempts with leaked credentials from other sites. Controls held; no funds moved.',
  },
  {
    id: 'INC-2607', title: 'Back-office reconciliation report delayed after release', category: 'Change failure', severity: 'High',
    service: 'Finance reconciliation', businessImpact: 'Daily investor-fund reconciliation delayed 2 days; month-end close at risk if repeated.',
    investorImpact: 'None directly.', detectedAt: '2026-10-14T07:30:00+08:00',
    status: 'Monitoring', owner: 'Chief Technology Officer', targetResolution: '2026-10-20', regulatoryAssessment: 'Not required',
    decisionRequired: null, containment: 'Release rolled back; manual reconciliation completed.', progress: 85,
    systems: ['Reporting service', 'General ledger export'],
    actions: [
      { text: 'Root-cause analysis', owner: 'Chief Technology Officer', due: '2026-10-21', done: false },
      { text: 'Add reconciliation check to release checklist', owner: 'Chief Technology Officer', due: '2026-10-31', done: false },
    ],
    timeline: [
      { at: '2026-10-14T07:30:00+08:00', text: 'Finance reports missing reconciliation output.' },
      { at: '2026-10-14T11:00:00+08:00', text: 'Release rolled back.' },
    ],
    pirStatus: 'Scheduled',
    summary: 'A software release broke the overnight reconciliation export. Rolled back; corrective actions overdue.',
  },
  {
    id: 'INC-2605', title: 'Investor portal slow during tranche opening', category: 'Availability', severity: 'Medium',
    service: 'Investor portal', businessImpact: 'Page load above 6 seconds for 40 minutes at Lintas Fibre Note 2 launch.',
    investorImpact: 'Some investors delayed subscribing; no failed subscriptions.', detectedAt: '2026-10-19T10:02:00+08:00',
    status: 'Resolved', owner: 'Chief Technology Officer', targetResolution: '2026-10-22', regulatoryAssessment: 'Not required',
    decisionRequired: null, containment: 'Resolved — capacity increased.', progress: 100,
    systems: ['Investor portal', 'Cloud hosting'],
    actions: [{ text: 'Pre-scale capacity before every tranche opening', owner: 'Chief Technology Officer', due: '2026-11-02', done: false }],
    timeline: [
      { at: '2026-10-19T10:02:00+08:00', text: 'Latency alert at tranche opening.' },
      { at: '2026-10-19T10:45:00+08:00', text: 'Additional capacity added; latency normal.' },
    ],
    pirStatus: 'Completed', summary: 'Demand spike at tranche launch exceeded portal capacity briefly.',
  },
  {
    id: 'INC-2603', title: 'eKYC vendor verification queue backlog', category: 'Third-party service', severity: 'Medium',
    service: 'Investor onboarding (KYC)', businessImpact: 'KYC turnaround rose from 1 day to 4 days; contributes to KYC-incomplete backlog.',
    investorImpact: 'New investors waiting longer for approval.', detectedAt: '2026-10-08T09:00:00+08:00',
    status: 'Monitoring', owner: 'Head of Investor Operations', targetResolution: '2026-10-30', regulatoryAssessment: 'Not required',
    decisionRequired: null, containment: 'Vendor added reviewers; queue reducing.', progress: 60,
    systems: ['eKYC vendor integration'],
    actions: [{ text: 'Weekly vendor service review', owner: 'Head of Investor Operations', due: '2026-10-30', done: false }],
    timeline: [{ at: '2026-10-08T09:00:00+08:00', text: 'Turnaround breach flagged by operations.' }],
    pirStatus: 'Not started', summary: 'Vendor-side backlog in identity verification.',
  },
  {
    id: 'INC-2601', title: 'Excess access rights found for two former contractors', category: 'Access control', severity: 'High',
    service: 'Back-office administration', businessImpact: 'Accounts were dormant; no evidence of use. Indicates gap in leaver process.',
    investorImpact: 'None identified.', detectedAt: '2026-09-29T15:20:00+08:00',
    status: 'Resolved', owner: 'Head of Information Security', targetResolution: '2026-10-03', regulatoryAssessment: 'Assessed — not reportable',
    decisionRequired: null, containment: 'Accounts disabled same day.', progress: 100,
    systems: ['Admin console', 'Cloud console'],
    actions: [{ text: 'Automate contractor offboarding with HR', owner: 'Head of Information Security', due: '2026-10-15', done: false }],
    timeline: [{ at: '2026-09-29T15:20:00+08:00', text: 'Found during quarterly access review.' }, { at: '2026-09-29T17:00:00+08:00', text: 'Accounts disabled.' }],
    pirStatus: 'Completed', summary: 'Leaver process did not cover contractors.',
  },
  {
    id: 'INC-2598', title: 'Duplicate notification emails sent to investors', category: 'Application defect', severity: 'Low',
    service: 'Investor notifications', businessImpact: 'Minor confusion; several support tickets.', investorImpact: 'Around 120 investors received duplicate allocation emails.',
    detectedAt: '2026-09-12T08:10:00+08:00', status: 'Closed', owner: 'Chief Technology Officer', targetResolution: '2026-09-15',
    regulatoryAssessment: 'Not required', decisionRequired: null, containment: 'Fixed.', progress: 100, systems: ['Notification service'],
    actions: [{ text: 'Patch deployed', owner: 'Chief Technology Officer', due: '2026-09-14', done: true }],
    timeline: [{ at: '2026-09-12T08:10:00+08:00', text: 'Reported by support.' }], pirStatus: 'Not required', summary: 'Retry logic sent emails twice.',
  },
  {
    id: 'INC-2595', title: 'Cloud storage bucket briefly misconfigured as public', category: 'Data', severity: 'Critical',
    service: 'Document storage', businessImpact: 'Bucket held marketing assets only; no investor data confirmed. Forensic review completed.',
    investorImpact: 'None confirmed.', detectedAt: '2026-08-27T16:45:00+08:00', status: 'Closed', owner: 'Head of Information Security',
    targetResolution: '2026-08-29', regulatoryAssessment: 'Assessed — not reportable', decisionRequired: null, containment: 'Closed within 25 minutes.',
    progress: 100, systems: ['Cloud storage'],
    actions: [{ text: 'Policy guardrail preventing public buckets', owner: 'Head of Information Security', due: '2026-09-10', done: true }],
    timeline: [{ at: '2026-08-27T16:45:00+08:00', text: 'Configuration scanner alert.' }, { at: '2026-08-27T17:10:00+08:00', text: 'Access removed.' }],
    pirStatus: 'Completed', summary: 'Mis-set permission on a non-investor storage bucket; fixed and guarded.',
  },
  {
    id: 'INC-2612', title: 'Issuer document portal unavailable for 3 hours', category: 'Infrastructure', severity: 'Medium',
    service: 'Issuer portal', businessImpact: 'Issuers unable to upload reporting documents on 22 Oct morning.', investorImpact: 'None.',
    detectedAt: '2026-10-22T06:20:00+08:00', status: 'Monitoring', owner: 'Chief Technology Officer', targetResolution: '2026-10-24',
    regulatoryAssessment: 'Not required', decisionRequired: null, containment: 'Service restored 09:25.', progress: 80,
    systems: ['Issuer portal', 'Database cluster'],
    actions: [{ text: 'Database failover review', owner: 'Chief Technology Officer', due: '2026-10-29', done: false }],
    timeline: [{ at: '2026-10-22T06:20:00+08:00', text: 'Portal unreachable.' }, { at: '2026-10-22T09:25:00+08:00', text: 'Restored after database failover.' }],
    pirStatus: 'Scheduled', summary: 'Database node failure; automatic failover did not trigger.',
  },
];

export const CYBER_RISKS: CyberRisk[] = [
  {
    id: 'CR-01', title: 'Payment gateway concentration', description: 'Single payment gateway handles all investor top-ups; outage stops funding.',
    area: 'Investor funding', likelihood: 4, impact: 5, controls: 'Contractual SLA; monitoring; manual bank-transfer fallback.',
    treatment: 'Contract and integrate a secondary payment channel.', owner: 'Chief Technology Officer', targetDate: '2026-09-30', treatmentComplete: false, residual: 'High', trend: 'Worsening',
  },
  {
    id: 'CR-02', title: 'Investor account takeover', description: 'Leaked credentials used to access investor accounts and redirect withdrawals.',
    area: 'Investor accounts', likelihood: 3, impact: 5, controls: 'Rate limiting; withdrawal to registered bank account only; optional 2FA.',
    treatment: 'Mandatory two-factor authentication for all investors.', owner: 'Head of Information Security', targetDate: '2026-12-01', treatmentComplete: false, residual: 'Medium', trend: 'Worsening',
  },
  {
    id: 'CR-03', title: 'Privileged access misuse', description: 'Excess or stale admin access could allow unauthorised changes to investor or tranche records.',
    area: 'Back office', likelihood: 3, impact: 4, controls: 'Quarterly access review; approval for admin roles.',
    treatment: 'Automated joiner-mover-leaver process and monthly privileged review.', owner: 'Head of Information Security', targetDate: '2026-10-15', treatmentComplete: false, residual: 'Medium', trend: 'Stable',
  },
  {
    id: 'CR-04', title: 'Ransomware affecting core platform', description: 'Encryption of production systems halting subscriptions and reporting.',
    area: 'Platform availability', likelihood: 2, impact: 5, controls: 'Immutable backups; endpoint protection; segmented networks.',
    treatment: 'Complete full restore test of production environment.', owner: 'Chief Technology Officer', targetDate: '2026-11-30', treatmentComplete: false, residual: 'Medium', trend: 'Stable',
  },
  {
    id: 'CR-05', title: 'eKYC and CTOS vendor dependency', description: 'Vendor outage or backlog delays investor onboarding.',
    area: 'Investor onboarding', likelihood: 3, impact: 3, controls: 'Vendor SLA; manual review fallback.',
    treatment: 'Agree service credits and escalation path in vendor contract renewal.', owner: 'Head of Investor Operations', targetDate: '2026-12-15', treatmentComplete: false, residual: 'Medium', trend: 'Worsening',
  },
  {
    id: 'CR-06', title: 'Sensitive data exposure via misconfiguration', description: 'Cloud misconfiguration exposing investor documents.',
    area: 'Data protection', likelihood: 2, impact: 5, controls: 'Configuration scanner; public-bucket guardrail (added Sep 2026).',
    treatment: 'Guardrail implemented; quarterly configuration audit.', owner: 'Head of Information Security', targetDate: '2026-09-10', treatmentComplete: true, residual: 'Low', trend: 'Improving',
  },
  {
    id: 'CR-07', title: 'Unreliable database failover', description: 'Failover not triggering automatically, extending outages.',
    area: 'Platform availability', likelihood: 3, impact: 3, controls: 'Manual failover runbook.',
    treatment: 'Fix and test automatic failover quarterly.', owner: 'Chief Technology Officer', targetDate: '2026-11-15', treatmentComplete: false, residual: 'Medium', trend: 'Worsening',
  },
  {
    id: 'CR-08', title: 'Insecure software releases', description: 'Defects or vulnerabilities introduced in releases reaching production.',
    area: 'Change management', likelihood: 3, impact: 3, controls: 'Code review; automated tests; staged rollout.',
    treatment: 'Add security scanning and reconciliation checks to release gate.', owner: 'Chief Technology Officer', targetDate: '2026-10-31', treatmentComplete: false, residual: 'Medium', trend: 'Stable',
  },
];

export const RESILIENCE: ResilienceMeasure[] = [
  { id: 'RM-1', label: 'Critical vulnerabilities overdue for remediation', value: '2', target: '0', status: 'Overdue', note: 'Both on the investor portal web server; patches scheduled 27 Oct.' },
  { id: 'RM-2', label: 'Privileged access reviews overdue', value: '1 of 4', target: '0', status: 'Overdue', note: 'Cloud console review due 15 Oct not completed.' },
  { id: 'RM-3', label: 'Backup and recovery tests', value: 'Last test partially failed', target: 'Pass quarterly', status: 'Failed', note: 'Sep test restored database but not document store within target.' },
  { id: 'RM-4', label: 'Critical third-party technology risks', value: '2', target: 'Monitored', status: 'Attention', note: 'Payment gateway and eKYC vendor.' },
  { id: 'RM-5', label: 'High-risk audit findings open', value: '3', target: '≤ 2', status: 'Attention', note: 'From synthetic internal IT audit, Jul 2026.' },
  { id: 'RM-6', label: 'Incident recovery within target (90 days)', value: '83%', target: '≥ 90%', status: 'Attention', note: '5 of 6 resolved incidents met target resolution time.' },
  { id: 'RM-7', label: 'Security awareness training completion', value: '96%', target: '≥ 95%', status: 'On track', note: 'Annual cycle.' },
];

export const AVAILABILITY: ServiceAvailability[] = [
  { service: 'Investor portal', availability: 99.71, target: 99.9 },
  { service: 'Wallet top-up', availability: 97.8, target: 99.5 },
  { service: 'Subscription engine', availability: 99.96, target: 99.9 },
  { service: 'Issuer portal', availability: 99.52, target: 99.5 },
  { service: 'Investor onboarding', availability: 99.93, target: 99.5 },
  { service: 'Back-office reporting', availability: 99.1, target: 99.0 },
];

/** Synthetic month-end count of open High or Critical cyber risks with incomplete treatment. The current month is computed live. */
export const CYBER_RISK_TREND = [
  { month: '2026-05', open: 2 },
  { month: '2026-06', open: 3 },
  { month: '2026-07', open: 3 },
  { month: '2026-08', open: 3 },
  { month: '2026-09', open: 4 },
];
