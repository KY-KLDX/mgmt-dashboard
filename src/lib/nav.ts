export type PageKey = 'overview' | 'finance' | 'investors' | 'issuers' | 'technology' | 'governance';
export type DrawerKind = 'tranche' | 'investor' | 'issuer' | 'incident' | 'risk' | 'governance' | 'investorList';

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
  { key: 'finance', label: 'Finance', title: 'Finance' },
  { key: 'investors', label: 'Investors', title: 'Investors' },
  { key: 'issuers', label: 'Issuers', title: 'Issuers' },
  { key: 'technology', label: 'Technology', title: 'Technology' },
  { key: 'governance', label: 'Governance', title: 'Governance' },
];
