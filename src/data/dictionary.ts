export interface MetricDef {
  term: string;
  definition: string;
  calculation: string;
  category: string;
  source: string;
  refresh: string;
  owner: string;
  caveat?: string;
}

const TBC = 'To be confirmed';

export const DICTIONARY: MetricDef[] = [
  {
    term: 'Successful Subscription Amount', definition: 'The subscription value accepted and successfully allocated when a tranche closes.',
    calculation: 'Sum of subscriptions with status "Allocated" in tranches whose close date falls in the period.', category: 'Finance — tranche',
    source: `Subscription ledger (placeholder, ${TBC.toLowerCase()})`, refresh: 'Daily', owner: TBC,
    caveat: 'Requests in open tranches are pending and are excluded until allocation at close.',
  },
  {
    term: 'Total (Gross) Subscription Value', definition: 'All subscription requests submitted, before allocation outcome.',
    calculation: 'Sum of Allocated + Rejected + Cancelled (+ Pending for open tranches) subscription requests.', category: 'Finance — tranche',
    source: 'Subscription ledger (placeholder)', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Subscription Success Rate', definition: 'Share of gross subscription value that was successfully allocated.',
    calculation: 'Successful subscription amount ÷ gross subscription value, for tranches closed in the period.', category: 'Finance — tranche',
    source: 'Derived', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Recognised Revenue', definition: 'Successful subscription amount multiplied by the applicable KLDX fee rate.',
    calculation: 'Σ (successful subscription amount × tranche fee rate). Fee rate is stored on each tranche.', category: 'Finance — tranche',
    source: 'Subscription ledger + tranche terms (placeholder)', refresh: 'Daily', owner: TBC,
    caveat: 'Never calculated on pending, rejected or cancelled subscriptions. Recognised at tranche close in this prototype; production recognition policy to be confirmed by Finance.',
  },
  {
    term: 'Weighted Average Fee Rate', definition: 'Average KLDX fee rate weighted by successful subscription amount.',
    calculation: 'Recognised revenue ÷ successful subscription amount.', category: 'Finance — tranche', source: 'Derived', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'EBITDA and Net Result', definition: 'Company-level month-end results from the monthly P&L.',
    calculation: 'EBITDA = revenue − operating expenses. Net result = EBITDA − depreciation and amortisation − finance costs.', category: 'Finance — company P&L',
    source: `General ledger (placeholder, ${TBC.toLowerCase()})`, refresh: 'Monthly, after month-end close', owner: TBC,
    caveat: 'Operating costs are not allocated to tranches, so no tranche-level profit is shown.',
  },
  {
    term: 'Active Tranche', definition: 'A tranche that is open, fully subscribed, closed awaiting issuance, or issued and not yet matured.',
    calculation: 'Count of tranches in stages Open, Fully Subscribed, Closed, Issued / Settled.', category: 'Finance — tranche', source: 'Tranche register (placeholder)', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Fulfilment', definition: 'Subscription progress against tranche target.',
    calculation: 'Closed tranches: successful ÷ target. Open tranches: pending valid requests ÷ target (indicative).', category: 'Finance — tranche', source: 'Derived', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Current Active Investor', definition: 'An investor with at least one current subscription.',
    calculation: 'Count of investors holding ≥1 Allocated subscription in a tranche that has closed and not matured.', category: 'Investors',
    source: 'Subscription ledger (placeholder)', refresh: 'Daily', owner: TBC,
    caveat: 'Pending requests in open tranches do not make an investor active until allocated.',
  },
  {
    term: 'Allocated Funds', definition: 'Investor funds successfully allocated into one or more tranches.',
    calculation: 'Headline: currently outstanding allocations. Investor records also show lifetime allocations, including matured tranches.', category: 'Investors',
    source: 'Subscription ledger (placeholder)', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Total Money Deposited', definition: 'The cumulative value of successful deposits made by an investor.',
    calculation: 'Sum of top-ups with final status "Successful".', category: 'Investors', source: 'Wallet ledger (placeholder)', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Wallet Balance', definition: 'Uninvested funds held in the investor wallet.',
    calculation: 'Successful deposits + maturity returns − lifetime allocations − pending subscription reservations − completed withdrawals.', category: 'Investors',
    source: 'Wallet ledger (placeholder)', refresh: 'Real time (production); fixed in prototype', owner: TBC,
  },
  {
    term: 'CTOS Incomplete', definition: 'An investor onboarding record where the required CTOS stage has not been successfully completed.',
    calculation: 'Investors who started onboarding and have not completed CTOS.', category: 'Investor onboarding',
    source: `CTOS integration (placeholder, ${TBC.toLowerCase()})`, refresh: 'Daily', owner: TBC,
  },
  {
    term: 'KYC Incomplete', definition: 'An investor onboarding record where the required KYC stage has not been successfully completed.',
    calculation: 'Investors who completed CTOS but have not completed KYC.', category: 'Investor onboarding',
    source: `eKYC provider (placeholder, ${TBC.toLowerCase()})`, refresh: 'Daily', owner: TBC,
    caveat: 'Records still at the CTOS stage are counted under CTOS Incomplete only, to avoid double counting.',
  },
  {
    term: 'Failed Top-Up', definition: 'A top-up transaction with a final failed status, excluding pending transactions.',
    calculation: 'Count and value of top-ups with status "Failed" dated in the period.', category: 'Investors', source: 'Payment gateway + wallet ledger (placeholder)', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Withdrawal', definition: 'A completed transfer of investor funds out of the platform or wallet.',
    calculation: 'Withdrawals with status "Completed" in the period. Reported as Investors with Completed Withdrawals and Completed Withdrawal Amount.', category: 'Investors',
    source: 'Wallet ledger (placeholder)', refresh: 'Daily', owner: TBC,
    caveat: 'An investor who withdraws is not categorised as "withdrawn" and may remain active.',
  },
  {
    term: 'Investor Concentration', definition: 'Share of current subscriptions held by the largest investors or value bands.',
    calculation: 'Band amount ÷ total current subscriptions. Concentration flag when a band holds ≥50% of value with ≤25% of active investors.', category: 'Investors', source: 'Derived', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Issuer Obligation', definition: 'A dated event or requirement tied to an issuer or tranche (closing, issuance, payment, reporting, renewal, submission).',
    calculation: 'Overdue when due date is before the reporting date and status is not Completed.', category: 'Issuers', source: 'Obligations register (placeholder)', refresh: 'Daily', owner: TBC,
  },
  {
    term: 'Cyber Risk Rating', definition: 'Overall rating from likelihood and impact (each 1–5).',
    calculation: 'Score = likelihood × impact. ≥15 Critical, 10–14 High, 5–9 Medium, <5 Low (demo scale).', category: 'Technology & cyber', source: 'Risk register (placeholder)', refresh: 'Monthly', owner: TBC,
    caveat: 'Demo scale only; not KLDX risk methodology.',
  },
  {
    term: 'Governance Item', definition: 'A policy, paper, decision, application, submission, risk acceptance, or management action requiring formal review, approval, endorsement, acknowledgement, or tracking.',
    calculation: 'Open when workflow stage is not Approved, Endorsed, Noted, Rejected or Closed.', category: 'Governance', source: 'Governance tracker (placeholder)', refresh: 'Real time (production)', owner: TBC,
  },
  {
    term: 'Critical Item Requiring Action', definition: 'An unresolved item meeting the configured demo threshold for critical severity, overdue status, major business impact, or urgent management decision.',
    calculation: 'Count of open alerts with severity Critical, generated across all domains from the demo thresholds in Settings.', category: 'Cross-domain', source: 'Derived from all registers', refresh: 'Daily', owner: TBC,
    caveat: 'Thresholds are illustrative and not KLDX policy.',
  },
];
