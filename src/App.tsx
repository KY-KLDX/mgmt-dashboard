import { useEffect, useState } from 'react';
import { DrawerHost } from './components/drawers/DrawerHost';
import { Sidebar } from './components/layout/Sidebar';
import { Toasts } from './components/layout/Toasts';
import { TopBar } from './components/layout/TopBar';
import { GlobalModals } from './components/modals/GlobalModals';
import { Skeleton } from './components/ui/Primitives';
import { FinancePage } from './pages/Finance';
import { GovernancePage } from './pages/Governance';
import { InvestorsPage } from './pages/Investors';
import { IssuersPage } from './pages/Issuers';
import { OverviewPage } from './pages/Overview';
import { TechnologyPage } from './pages/Technology';
import { AppProvider, useApp } from './state/AppState';

function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px]" />)}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Skeleton className="h-80 xl:col-span-7" />
        <Skeleton className="h-80 xl:col-span-5" />
      </div>
    </div>
  );
}

function Shell() {
  const { page } = useApp();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(t);
  }, []);
  const Page = { overview: OverviewPage, finance: FinancePage, investors: InvestorsPage, issuers: IssuersPage, technology: TechnologyPage, governance: GovernancePage }[page];
  return (
    <div className="flex h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <div className="hidden lg:block"><Sidebar /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main id="main" className="relative min-w-0 flex-1 overflow-y-auto scroll-thin">
          <TopBar />
          <div className="mx-auto max-w-[1680px] px-6 py-6">{loading ? <PageSkeleton /> : <Page key={page} />}</div>
        </main>
      </div>
      <DrawerHost />
      <GlobalModals />
      <Toasts />
    </div>
  );
}

function MobileNav() {
  const { page, navigate } = useApp();
  return (
    <div className="flex items-center gap-3 bg-rail px-4 py-2.5 text-rail-ink lg:hidden">
      <span className="font-display text-[17px] font-semibold">KLDX <span className="text-[11px] font-sans uppercase tracking-[0.14em] text-rail-muted">Management</span></span>
      <label htmlFor="mobile-nav" className="sr-only">Page</label>
      <select id="mobile-nav" value={page} onChange={(e) => navigate({ page: e.target.value as typeof page })} className="ml-auto h-8 rounded-md bg-rail-hover px-2 text-[13px] text-rail-ink">
        <option value="overview">Executive Overview</option>
        <option value="finance">Finance & Tranches</option>
        <option value="investors">Investors</option>
        <option value="issuers">Issuers & Obligations</option>
        <option value="technology">Technology & Cyber Risk</option>
        <option value="governance">Governance & Actions</option>
      </select>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
