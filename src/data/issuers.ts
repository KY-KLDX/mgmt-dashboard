import type { Issuer } from './types';

// All issuer names are fictional and do not refer to real companies.
export const ISSUERS: Issuer[] = [
  {
    id: 'ISS-01', name: 'Selatan Agro Ventures Sdn Bhd', sector: 'Agriculture', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2025-08-04',
    summary: 'Durian and palm smallholder aggregator in Johor. Two notes issued; repeat issuer.',
    updates: [
      { date: '2026-10-20', text: 'Q3 management accounts still outstanding; reminder issued to issuer CFO.', by: 'Head of Issuer Origination' },
      { date: '2026-09-30', text: 'Profit payment for Note 2 confirmed for 12 Dec.', by: 'Head of Finance' },
    ],
  },
  {
    id: 'ISS-02', name: 'Bayu Lestari Solar Sdn Bhd', sector: 'Renewable energy', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2025-09-15',
    summary: 'Commercial rooftop solar installer financing receivable-backed projects.',
    updates: [{ date: '2026-10-06', text: 'Annual audited accounts received ahead of deadline.', by: 'Head of Compliance' }],
  },
  {
    id: 'ISS-03', name: 'Teratak Logistics Sdn Bhd', sector: 'Logistics', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2025-10-01',
    summary: 'Cold-chain last-mile logistics operator in the Klang Valley.',
    updates: [
      { date: '2026-10-21', text: 'Issuance of Note 2 delayed: conditions-precedent board resolution not yet signed.', by: 'Head of Legal' },
      { date: '2026-10-02', text: 'Note 2 closed at 93% of target.', by: 'Head of Investor Operations' },
    ],
  },
  {
    id: 'ISS-04', name: 'Cendana Healthcare Group Sdn Bhd', sector: 'Healthcare', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2025-11-10',
    summary: 'Network of outpatient clinics in Selangor and Perak.',
    updates: [{ date: '2026-10-14', text: 'Facility agreement renewal draft received from issuer counsel.', by: 'Head of Legal' }],
  },
  {
    id: 'ISS-05', name: 'Meranti Hartanah Development Sdn Bhd', sector: 'Property', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2025-12-01',
    summary: 'Mid-market landed residential developer; notes fund construction progress billing gaps.',
    updates: [
      { date: '2026-10-22', text: 'Note 1 principal repayment (18 Nov) — issuer confirmed sinking fund at 85%.', by: 'Head of Finance' },
      { date: '2026-10-12', text: 'Note 2 reached full subscription ahead of close.', by: 'Head of Investor Operations' },
    ],
  },
  {
    id: 'ISS-06', name: 'Kilau Halal Foods Sdn Bhd', sector: 'Food manufacturing', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2026-01-12',
    summary: 'Halal-certified frozen food manufacturer supplying regional retailers.',
    updates: [{ date: '2026-10-16', text: 'Note 2 closed at 99% of target; issuance scheduled 26 Oct.', by: 'Head of Investor Operations' }],
  },
  {
    id: 'ISS-07', name: 'Arus Marine Services Sdn Bhd', sector: 'Marine services', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2026-03-02',
    summary: 'Offshore support vessel operator. Note 1 under-subscribed; Note 2 tracking below target.',
    updates: [
      { date: '2026-10-22', text: 'Note 2 at 46% with 4 days to close. Options paper for CEO: extend, downsize or close.', by: 'Head of Issuer Origination' },
    ],
  },
  {
    id: 'ISS-08', name: 'Permata EduTech Sdn Bhd', sector: 'Education technology', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2026-04-20',
    summary: 'B2B learning platform for private colleges. Note 2 launching 3 Nov.',
    updates: [{ date: '2026-10-19', text: 'Note 2 offering documents in final legal review.', by: 'Head of Legal' }],
  },
  {
    id: 'ISS-09', name: 'Lintas Fibre Networks Sdn Bhd', sector: 'Telecoms infrastructure', status: 'Active',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2026-05-18',
    summary: 'Rural fibre backhaul builder with long-dated government-linked contracts.',
    updates: [{ date: '2026-10-19', text: 'Note 2 opened; 31% subscribed in first four days.', by: 'Head of Investor Operations' }],
  },
  {
    id: 'ISS-10', name: 'Seri Kencana Textiles Sdn Bhd', sector: 'Textile manufacturing', status: 'Inactive',
    relationshipOwner: 'Head of Issuer Origination', onboardedOn: '2026-06-30',
    summary: 'Onboarded but first issuance deferred pending audited accounts.',
    updates: [{ date: '2026-09-25', text: 'Issuance deferred to 2027 at issuer request.', by: 'Head of Issuer Origination' }],
  },
];
