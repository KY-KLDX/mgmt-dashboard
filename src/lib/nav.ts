export type PageKey = 'overview' | 'finance' | 'investors' | 'issuers' | 'technology' | 'governance';
export type DrawerKind = 'tranche' | 'investor' | 'issuer' | 'incident' | 'risk' | 'governance';

export interface DrawerRef {
  kind: DrawerKind;
  id: string;
}

export interface LinkTarget {
  page: PageKey;
  params?: Record<string, string>;
  drawer?: DrawerRef;
}

export const PAGES: { key: PageKey; label: string; title: string }[] = [
  { key: 'overview', label: 'Executive Overview', title: 'Executive Overview' },
  { key: 'finance', label: 'Finance & Tranches', title: 'Finance & Tranches' },
  { key: 'investors', label: 'Investors', title: 'Investors' },
  { key: 'issuers', label: 'Issuers & Obligations', title: 'Issuers & Obligations' },
  { key: 'technology', label: 'Technology & Cyber Risk', title: 'Technology & Cyber Risk' },
  { key: 'governance', label: 'Governance & Actions', title: 'Governance & Management Actions' },
];
