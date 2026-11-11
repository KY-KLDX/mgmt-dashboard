import type { ProfileChange } from './types';

// Synthetic profile updates made by (or for) existing investors. Summaries deliberately omit
// the changed values for contact, bank and identity data.
export const PROFILE_CHANGES: ProfileChange[] = [
  { id: 'PC-01', investorId: 'INV-1001', type: 'Bank account', date: '2026-10-18', time: '21:47', summary: 'Changed withdrawal bank account', status: 'Pending review' },
  { id: 'PC-02', investorId: 'INV-1013', type: 'Bank account', date: '2026-10-12', time: '23:05', summary: 'Changed withdrawal bank account', status: 'Pending review' },
  { id: 'PC-03', investorId: 'INV-1071', type: 'Bank account', date: '2026-09-30', time: '10:12', summary: 'Changed withdrawal bank account (verified)', status: 'Completed' },
  { id: 'PC-04', investorId: 'INV-1029', type: 'Investor type', date: '2026-10-21', time: '15:30', summary: 'Updated investor type: Retail → Sophisticated', status: 'Completed' },
  { id: 'PC-05', investorId: 'INV-1083', type: 'Investor type', date: '2026-10-07', time: '11:18', summary: 'Updated investor type: Sole proprietor → Corporate', status: 'Completed' },
  { id: 'PC-06', investorId: 'INV-1047', type: 'Investor type', date: '2026-09-25', time: '09:41', summary: 'Updated investor type: Retail → Sophisticated', status: 'Completed' },
  { id: 'PC-07', investorId: 'INV-1053', type: 'Contact details', date: '2026-10-20', time: '13:02', summary: 'Updated phone number', status: 'Completed' },
  { id: 'PC-08', investorId: 'INV-1089', type: 'Contact details', date: '2026-10-16', time: '19:24', summary: 'Updated email address', status: 'Completed' },
  { id: 'PC-09', investorId: 'INV-1107', type: 'Contact details', date: '2026-10-05', time: '08:55', summary: 'Updated phone number', status: 'Completed' },
  { id: 'PC-10', investorId: 'INV-1019', type: 'Contact details', date: '2026-09-28', time: '16:37', summary: 'Updated email address', status: 'Completed' },
  { id: 'PC-11', investorId: 'INV-1131', type: 'Contact details', date: '2026-10-22', time: '10:06', summary: 'Updated email address', status: 'Completed' },
  { id: 'PC-12', investorId: 'INV-1061', type: 'Address / ID re-verification', date: '2026-10-19', time: '12:20', summary: 'Updated address; KYC re-check started', status: 'Pending review' },
  { id: 'PC-13', investorId: 'INV-1037', type: 'Address / ID re-verification', date: '2026-10-09', time: '14:44', summary: 'Renewed ID document; KYC re-check passed', status: 'Completed' },
  { id: 'PC-14', investorId: 'INV-1095', type: 'Address / ID re-verification', date: '2026-09-22', time: '17:15', summary: 'Updated address; KYC re-check passed', status: 'Completed' },
];
