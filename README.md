# KLDX Management Dashboard: prototype

A clickable frontend prototype of an executive management dashboard for the KLDX CEO and Senior Management Team.

> **Prototype using synthetic demonstration data. Not connected to KLDX production systems.**
> All investor, issuer, policy, application and incident names are fictional. No figure represents real KLDX performance.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run typecheck` | Strict TypeScript check |
| `npm run build` | Production build to `dist/` |
| `npm run build:single` | Single self-contained HTML file in `dist-single/` (for sharing) |
| `npm run verify:data` | 36 reconciliation checks on the synthetic dataset |
| `npm run smoke` | Browser smoke test (needs `npm run dev` running and a Chromium; set `CHROME_PATH`) |

No backend, database, login, API key or external service is required. Fonts load from Google Fonts. If they are unavailable, the app falls back to system fonts.

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · Recharts · lucide-react. State is held in React context with a reducer (`src/state/AppState.tsx`), covering role, reporting period, thresholds, investor bands, governance edits, drawers, modals and toasts. Page filters live in route parameters, so clicking a KPI opens the target page already filtered.

## Pages

Each page shows at most four KPI cards. Supporting detail sits behind the (i) icon on each card.

1. **Executive Overview** is a one-glance screen: Subscriptions, Revenue, Active investors and Critical items, plus the top five items needing a decision (or, on the Upcoming tab, the top five upcoming items).
2. **Finance & Tranches**: tranche pipeline, filterable tranche table, monthly subscriptions, monthly company P&L.
3. **Investors**: onboarding funnel (CTOS and KYC as separate stages), value bands, investor rankings and exceptions.
4. **Issuers & Obligations**: 30/60/90-day timeline and obligations table.
5. **Technology & Cyber Risk**: incidents, top five risks with a linked risk matrix, resilience measures.
6. **Governance & Management Actions**: My Actions, CEO & SMT, Board, Policies & applications, All.

Detail drawers open on a single "Issue / Next / Blocked" line and the key facts. Everything else is folded into sections you expand on demand. Governance editing sits behind the **Update** button.

Synthetic data is marked once, by the badge in the top bar. Definitions and caveats live in the metric dictionary (book icon) and in the (i) tooltips.

## Data model (`src/data`)

- Fixed reporting date: **23 Oct 2026, 08:30 MYT** (`asOf.ts`). Financial year: January to December.
- `tranches.ts`: 18 tranches. The applicable KLDX fee rate is stored on each tranche.
- `investors.ts`: deterministic generator (seeded PRNG) for 58 investors, their subscriptions and wallet transactions. Tranche totals are *built from* subscription records, so every figure reconciles.
- `pnl.ts`: company-level operating cost lines and budget. **P&L revenue is not stored.** It is taken from recognised tranche revenue for the month. Costs are never allocated to tranches, so no tranche profit is shown.
- `obligations.ts`, `tech.ts`, `governance.ts`: obligations, incidents, cyber risks, resilience measures and governance items.
- `thresholds.ts`: illustrative alert thresholds and investor bands. These are not KLDX policy and can be changed in **Demo settings**.
- `dictionary.ts`: metric dictionary. Source systems and owners are marked *To be confirmed*.

All KPIs, charts and tables are computed by pure selectors in `src/lib/selectors`. Alerts come from one shared model (`alerts.ts`) with severities Critical, High, Medium, Low and Informational.

Key rules:

- Recognised revenue = successful (allocated) subscription × tranche fee rate. Pending, rejected and cancelled requests never count.
- A current active investor holds at least one allocated subscription in a tranche that has closed and not matured.
- KYC Incomplete counts records that have passed CTOS, so a record is never counted under both CTOS and KYC.

## Role simulation

The **CEO View / Management View** switch is a *demo simulation only*. All investor display text goes through `src/lib/identity.ts`. In Management View it returns anonymised IDs (e.g. `INV-1047`), and search matches IDs only. The smoke test checks that no investor name appears anywhere on screen in Management View.

Real access control must be enforced server-side. In this prototype the full dataset is shipped to the browser.

## Connecting to production later (not implemented)

None of these integrations exist. A production build would need:

1. **A server-side API** that replaces `src/data/*`. The selector inputs (tranches, subscriptions, transactions, P&L lines, obligations, incidents, risks, governance items) are the natural API contracts.
2. **Server-side role-based access control.** Management users would receive anonymised investor records from the API, rather than having names hidden in the browser.
3. **Source mappings to agree with KLDX:** subscription ledger, wallet/payment ledger, CTOS and eKYC status feeds, general ledger for month-end P&L, the obligations register, ITSM/incident tooling, the risk register and the governance tracker.
4. **Formally agreed thresholds, revenue-recognition policy and metric owners**, replacing the demo values and the *To be confirmed* placeholders.
5. **Audited write paths** for governance updates (currently held in browser memory), and server-generated, logged exports.
