import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { GOVERNANCE } from '../data/governance';
import { DEFAULT_BANDS, DEFAULT_THRESHOLDS, type Bands, type Thresholds } from '../data/thresholds';
import type { GovItem, Role } from '../data/types';
import { AS_OF, AS_OF_TIME } from '../data/asOf';
import { PAGES, type DrawerRef, type LinkTarget, type PageKey } from '../lib/nav';
import { buildPeriod, type Period, type PeriodKey, type Range } from '../lib/period';
import { buildAlerts, type Alert } from '../lib/selectors/alerts';

export type ModalKind = 'search' | 'export' | 'dictionary' | 'settings' | 'notifications' | null;

export interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'info';
}

interface State {
  role: Role;
  periodKey: PeriodKey;
  custom: Range;
  thresholds: Thresholds;
  bands: Bands;
  governance: GovItem[];
  /** Management View persona used for "My Actions". */
  mgmtOwner: string;
  page: PageKey;
  params: Record<string, string>;
  drawer: DrawerRef | null;
  modal: ModalKind;
  toasts: Toast[];
  demoError: boolean;
}

type Action =
  | { type: 'role'; role: Role }
  | { type: 'period'; key: PeriodKey; custom?: Range }
  | { type: 'thresholds'; value: Thresholds }
  | { type: 'bands'; value: Bands }
  | { type: 'gov'; id: string; patch: Partial<GovItem>; log: string; by: string }
  | { type: 'mgmtOwner'; value: string }
  | { type: 'navigate'; target: LinkTarget }
  | { type: 'params'; params: Record<string, string> }
  | { type: 'drawer'; drawer: DrawerRef | null }
  | { type: 'modal'; modal: ModalKind }
  | { type: 'toast'; toast: Toast }
  | { type: 'dismissToast'; id: number }
  | { type: 'demoError'; value: boolean };

function readHash(): { page: PageKey; params: Record<string, string> } {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const [p, q] = raw.split('?');
    const page = (PAGES.find((x) => x.key === p)?.key ?? 'overview') as PageKey;
    return { page, params: Object.fromEntries(new URLSearchParams(q ?? '')) };
  } catch {
    return { page: 'overview', params: {} };
  }
}

const initial = (): State => ({
  role: 'CEO',
  periodKey: 'MTD',
  custom: { start: '2026-08-01', end: AS_OF },
  thresholds: DEFAULT_THRESHOLDS,
  bands: DEFAULT_BANDS,
  governance: GOVERNANCE,
  mgmtOwner: 'Head of Compliance',
  ...readHash(),
  drawer: null,
  modal: null,
  toasts: [],
  demoError: false,
});

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'role':
      return { ...s, role: a.role };
    case 'period':
      return { ...s, periodKey: a.key, custom: a.custom ?? s.custom };
    case 'thresholds':
      return { ...s, thresholds: a.value };
    case 'bands':
      return { ...s, bands: a.value };
    case 'gov':
      return {
        ...s,
        governance: s.governance.map((g) =>
          g.id === a.id
            ? { ...g, ...a.patch, activity: [{ at: `${AS_OF}T${AS_OF_TIME}:00+08:00`, by: a.by, text: a.log }, ...g.activity] }
            : g,
        ),
      };
    case 'mgmtOwner':
      return { ...s, mgmtOwner: a.value };
    case 'navigate':
      return { ...s, page: a.target.page, params: a.target.params ?? {}, drawer: a.target.drawer ?? null, modal: null };
    case 'params':
      return { ...s, params: a.params };
    case 'drawer':
      return { ...s, drawer: a.drawer };
    case 'modal':
      return { ...s, modal: a.modal };
    case 'toast':
      return { ...s, toasts: [...s.toasts.slice(-2), a.toast] };
    case 'dismissToast':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'demoError':
      return { ...s, demoError: a.value };
  }
}

interface Ctx extends State {
  period: Period;
  alerts: Alert[];
  dispatch: React.Dispatch<Action>;
  navigate: (t: LinkTarget) => void;
  setParams: (p: Record<string, string>) => void;
  openDrawer: (d: DrawerRef) => void;
  closeDrawer: () => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  actor: string;
}

const AppCtx = createContext<Ctx | null>(null);
let toastSeq = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const period = useMemo(() => buildPeriod(state.periodKey, state.custom), [state.periodKey, state.custom]);
  const alerts = useMemo(() => buildAlerts(state.governance, state.thresholds, state.role), [state.governance, state.thresholds, state.role]);

  useEffect(() => {
    try {
      const q = new URLSearchParams(state.params).toString();
      const next = `#/${state.page}${q ? `?${q}` : ''}`;
      if (window.location.hash !== next) window.history.replaceState(null, '', next);
    } catch {
      /* hash sync is a convenience only */
    }
  }, [state.page, state.params]);

  const navigate = useCallback((t: LinkTarget) => {
    dispatch({ type: 'navigate', target: t });
    try {
      document.getElementById('main')?.scrollTo({ top: 0 });
    } catch {
      /* ignore */
    }
  }, []);
  const setParams = useCallback((p: Record<string, string>) => dispatch({ type: 'params', params: p }), []);
  const openDrawer = useCallback((d: DrawerRef) => dispatch({ type: 'drawer', drawer: d }), []);
  const closeDrawer = useCallback(() => dispatch({ type: 'drawer', drawer: null }), []);
  const toast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = toastSeq++;
    dispatch({ type: 'toast', toast: { id, text, tone } });
    window.setTimeout(() => dispatch({ type: 'dismissToast', id }), 4200);
  }, []);

  const value: Ctx = {
    ...state, period, alerts, dispatch, navigate, setParams, openDrawer, closeDrawer, toast,
    actor: state.role === 'CEO' ? 'CEO (demo)' : `${state.mgmtOwner} (demo)`,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

/** Read/write a page filter stored in the route params, so KPI click-throughs can pre-filter pages. */
export function useParam(key: string, fallback = ''): [string, (v: string) => void] {
  const { params, setParams } = useApp();
  const value = params[key] ?? fallback;
  const set = useCallback(
    (v: string) => {
      const next = { ...params };
      if (!v || v === fallback) delete next[key];
      else next[key] = v;
      setParams(next);
    },
    [params, setParams, key, fallback],
  );
  return [value, set];
}
