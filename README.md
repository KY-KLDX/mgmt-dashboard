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
| `npm run verify:data` | 63 reconciliation checks on the synthetic dataset |
| `npm run smoke` | 38 browser checks (including a phone-width check): header search, period control, Overview → Investor Operations hand-off, sidebar labels, Finance pipeline and payment recording, governance update (needs `npm run dev` running and a Chromium; set `CHROME_PATH`) |

No backend, database, login, API key or external service is required. Fonts load from Google Fonts. If they are unavailable, the app falls back to system fonts.

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · Recharts · lucide-react. State is held in React context with a reducer (`src/state/AppState.tsx`), covering role, reporting period, thresholds, investor bands, governance edits, drawers, modals and toasts. Page filters live in route parameters, so clicking a KPI opens the target page already filtered.

## Pages

Each page shows at most four KPI cards. Supporting detail sits behind the (i) icon on each card.

1. **Executive Overview**: three headline cards (Total subscriptions, Revenue from all fee types, Active investors) with sparklines, **Subscription progress** as an executive summary rather than a table: one bar per live tranche with a verdict (Oversubscribed / On pace / Close call / At risk) and a straight-line *expected at close* estimate, plus a one-line note of upcoming tranches. Closed tranches are not shown here. Hovering shows more detail; clicking opens the tranche in Investor Operations' full table (no drawer). The estimate is raised + average daily pace × days left; it flatters tranches that had an early rush, so it is labelled as an estimate, an investor snapshot donut (active / approved but not invested / not yet verified), the next three issuer milestones, and the top three priority decisions.
2. **Finance** (the money view):
   - Headline cards: Total subscriptions · Revenue (all fee types) · Success rate · Due to investors in 30 days (with any issuer shortfall).
   - **Tranche pipeline** as chevrons with tranche names; hover a name for its details, click a stage to filter the table.
   - **Revenue by fee type**: monthly bars (amount or share %) and a 2026 total per fee type.
   - **Tranche position**: one row per tranche with Funding (in plain words: not open yet / subscribed so far / raised), **KLDX fees** (our revenue: earned, and anything still owed with its due date), **Issuer payment due** (profit or principal the issuer owes investors, which KLDX passes through), **Due to pay out** (release to the issuer or investor payouts) and a plain **Next action**. Colours: red overdue, amber due within 10 days, grey later, green settled.
   - Expanding a tranche shows its **payment schedule**, sorted by due date, with direction labels (Issuer → KLDX, KLDX → investors, KLDX → issuer, Fee). Click ✎ or double-click a line to record the amount, date and bank ref; a bank ref is required. **Prototype: records are kept in the browser only and reset on reload.**
   - **Company P&L**: upload box (not connected), month detail with reported revenue against the all-fee calculation, and a 12-month trend.
3. **Investor Operations**: four headline cards (Total subscriptions and Active investors, styled as on the Overview, Onboarding incomplete, Failed top-ups); a row with **Risk profile** (synthetic AML/CDD rating, Low / Medium / High, with high-risk investors awaiting review), the onboarding funnel and value bands; a **recent activity** feed; **Account alerts** (failed top-ups, large deposit vs profile, deposit then quick withdrawal, recent bank-account change, onboarding stalls, KYC aging, accounts under review); **Subscription progress** (operational detail: target, raised, gross requests, subscribers, daily pace, days to close); **Allocation & minting** (after close: 1 Confirm → 2 Mint → 3 Allocate → 4 Release funds to the issuer); and the full **investor table** (IDs only, with a Risk column). Clicking a risk level, band, funnel stage, alert or headline card filters the table.
4. **Issuers**: 30/60/90-day timeline and obligations table.
5. **Technology**: incidents, top five risks with a linked risk matrix, resilience measures.
6. **Governance**: My Actions, CEO & SMT, Board, Policies & applications, All.

Detail drawers open on a single "Issue / Next / Blocked" line and the key facts. Everything else is folded into sections you expand on demand. Governance editing sits behind the **Update** button.

Synthetic data is marked once, by the badge in the top bar. Definitions and caveats live in the metric dictionary (book icon) and in the (i) tooltips.

## Data model (`src/data`)

- Fixed reporting date: **23 Oct 2026, 08:30 MYT** (`asOf.ts`). Financial year: January to December.
- `tranches.ts`: 18 tranches. The applicable KLDX fee rate is stored on each tranche.
- `investors.ts`: deterministic generator (seeded PRNG) for 58 investors, their subscriptions and wallet transactions. Tranche totals are *built from* subscription records, so every figure reconciles.
- `pnl.ts`: company-level operating cost lines and budget. **P&L revenue is not stored.** The Finance P&L uses all fees earned in the month. The synthetic revenue budget was scaled to the all-fee level (about 2× the original distribution-only budget). Costs are never allocated to tranches, so no tranche profit is shown.
- `allocations.ts`: hand-written post-close workflow (confirm, mint, allocate, release).
- `lib/selectors/fees.ts`: fee model from the KLDX Fees & Charges schedule (standard fees) and the payment schedule. Assumptions to confirm with Finance:
  - profit is paid half-yearly from the issue date, with principal and the final period's profit at maturity;
  - application (RM 50,000) and legal DD (RM 30,000) are invoiced per project two months before a tranche opens; initial and annual listing RM 25,000; custody 0.1% a year of tokens in circulation, invoiced quarterly in arrears; profit distribution 0.5% and investor service fee 1% of profit (never principal); delisting 1% at every delisting including maturity;
  - distribution and service fees are deducted at source; other fees are invoiced on 30-day terms;
  - small transaction fees (refund, transfer, trading) are not modelled; the investor subscription fee is waived.
- `obligations.ts`, `tech.ts`, `governance.ts`: obligations, incidents, cyber risks, resilience measures and governance items.
- `thresholds.ts`: illustrative alert thresholds and investor bands. These are fixed demo values, not KLDX policy.
- `dictionary.ts`: metric dictionary. Source systems and owners are marked *To be confirmed*.

All KPIs, charts and tables are computed by pure selectors in `src/lib/selectors`. Alerts come from one shared model (`alerts.ts`) with severities Critical, High, Medium, Low and Informational.

Key rules:

- Distribution fee = successful (allocated) subscription × tranche fee rate. Pending, rejected and cancelled requests never count. **Revenue** on the Overview and Finance counts every fee type, not only the distribution fee.
- Open questions: whether recording a release should move a tranche from Closed to Issued, and saving/sharing recorded payments (next step; it needs the dashboard shared with named people rather than anyone with the link).
- A current active investor holds at least one allocated subscription in a tranche that has closed and not matured.
- KYC Incomplete counts records that have passed CTOS, so a record is never counted under both CTOS and KYC.

## Access

There is one view. **The dashboard holds no investor names at all**: only the investor ID and initials. The investor table shows IDs only; everywhere else shows ID plus initials (e.g. `INV-1017 · SFO`), and search matches IDs or initials. Because names are not in the data that reaches the browser, a leaked or hacked page cannot link a person to how much they hold. A production build should keep this rule on the server: send IDs and initials only, keep names in the back-office system of record, and still restrict who can open the dashboard.

## Header controls

- **Period:** pick a month (October 2025 to October 2026) or *Year to date*. The start and end dates beside it are always editable; changing them sets a custom range.
- **Search:** type in the field at the top right (or press Ctrl/⌘K). Matching tranches, issuers, investors, incidents, policies and obligations drop down under the field.
- **Bell:** notifications grouped as Overdue, This week and Watching.

## Connecting to production later (not implemented)

None of these integrations exist. A production build would need:

1. **A server-side API** that replaces `src/data/*`. The selector inputs (tranches, subscriptions, transactions, P&L lines, obligations, incidents, risks, governance items) are the natural API contracts.
2. **Server-side access control** for who may open the dashboard, plus audit logging of access to investor records.
3. **Source mappings to agree with KLDX:** subscription ledger, wallet/payment ledger, CTOS and eKYC status feeds, general ledger for month-end P&L, the obligations register, ITSM/incident tooling, the risk register and the governance tracker.
4. **Formally agreed thresholds, revenue-recognition policy and metric owners**, replacing the demo values and the *To be confirmed* placeholders.
5. **Audited write paths** for governance updates (currently held in browser memory), and server-generated, logged exports.
