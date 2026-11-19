import { AlertTriangle, CircleCheck, Hourglass, Minus, Target, Coins } from 'lucide-react';
import { Fragment, useEffect } from 'react';
import { Progress } from '../components/ui/Primitives';
import { Panel } from '../components/ui/Showcase';
import { daysFromAsOf } from '../data/asOf';
import { date, dateShort, pct, rm } from '../lib/format';
import { issuerShort } from '../lib/selectors/finance';
import { allocationTracker, subscriptionProgress, type ProgressRow, type StepState } from '../lib/selectors/operations';
import { useApp } from '../state/AppState';

const SECTION_LABEL: Record<ProgressRow['section'], string> = {
  Current: 'Current tranches', Upcoming: 'Upcoming tranches', 'Recently closed': 'Recently closed',
};

function status(s: ProgressRow): { label: string; cls: string } {
  if (s.tranche.stage === 'Upcoming') return { label: 'Not open', cls: 'bg-mute-soft text-mute' };
  if (s.risk === 'Critical' || s.risk === 'Attention') return { label: 'At risk', cls: 'bg-crit-soft text-crit' };
  if (s.tranche.stage === 'Fully Subscribed') return { label: 'Fully subscribed', cls: 'bg-good-soft text-good' };
  if (s.tranche.stage === 'Closed') return { label: 'Closed', cls: 'bg-info-soft text-info' };
  if (s.tranche.stage === 'Issued / Settled') return { label: 'Issued', cls: 'bg-mute-soft text-mute' };
  return { label: 'On track', cls: 'bg-good-soft text-good' };
}

const TH = 'whitespace-nowrap bg-sunken px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-2';
const TD = 'border-b border-line/70 px-3 py-2.5';

function SectionRow({ label, cols }: { label: string; cols: number }) {
  return (
    <tr aria-hidden>
      <td colSpan={cols} className="pt-2">
        <span className="flex items-center gap-2.5 rounded-lg bg-accent-soft/60 px-3 py-1.5">
          <span className="h-4 w-0.5 rounded bg-accent" />
          <span className="font-display text-[15px] font-semibold italic">{label}</span>
        </span>
      </td>
    </tr>
  );
}

/** Detailed subscription progress for operations. `focus` highlights a tranche opened from the Overview. */
export function SubscriptionProgressSection({ focus }: { focus: string }) {
  const { thresholds, openDrawer } = useApp();
  const rows = subscriptionProgress(thresholds, 4);
  useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => document.getElementById(`sp-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    return () => window.clearTimeout(t);
  }, [focus]);

  return (
    <div id="subscription-progress" className="scroll-mt-40">
      <Panel icon={Target} title="Subscription progress" info="Live, upcoming and recently closed tranches with the operational detail: requests, subscribers, pace and days to close. Select a row for the full tranche record.">
        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-[13px]">
            <caption className="sr-only">Subscription progress by tranche</caption>
            <thead><tr>
              {['Tranche', 'Issuer', 'Opens', 'Closes', 'Days', 'Target', 'Raised so far', 'Gross requests', 'Subscribers', 'Progress', 'Daily pace', 'Status'].map((h, i) => (
                <th key={h} scope="col" className={`${TH} ${[4, 5, 6, 7, 8, 10].includes(i) ? 'text-right' : ''} ${i === 0 ? 'rounded-l-lg' : ''} ${i === 11 ? 'rounded-r-lg' : ''}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((s, i) => {
                const st = status(s);
                const d = daysFromAsOf(s.tranche.closeDate);
                const focused = focus === s.tranche.id;
                return (
                  <Fragment key={s.tranche.id}>
                    {(i === 0 || rows[i - 1].section !== s.section) && <SectionRow label={SECTION_LABEL[s.section]} cols={12} />}
                    <tr id={`sp-${s.tranche.id}`} tabIndex={0} onClick={() => openDrawer({ kind: 'tranche', id: s.tranche.id })}
                      onKeyDown={(e) => { if (e.key === 'Enter') openDrawer({ kind: 'tranche', id: s.tranche.id }); }}
                      className={`cursor-pointer hover:bg-sunken/70 focus-visible:outline-none ${focused ? 'bg-accent-soft ring-2 ring-inset ring-accent/40' : ''}`}>
                      <td className={TD}><span className="whitespace-nowrap"><span className="block font-semibold">{s.tranche.id}</span><span className="block text-[12px] text-ink-3">{s.tranche.name}</span></span></td>
                      <td className={`${TD} whitespace-nowrap text-ink-2`}>{issuerShort(s.tranche.issuerId)}</td>
                      <td className={`${TD} num whitespace-nowrap`}>{dateShort(s.tranche.openDate)}</td>
                      <td className={`${TD} num whitespace-nowrap`}>{dateShort(s.tranche.closeDate)}</td>
                      <td className={`${TD} num whitespace-nowrap text-right ${d >= 0 && d <= 7 && s.section === 'Current' ? 'font-semibold text-warn' : 'text-ink-2'}`}>{d >= 0 ? `${d} left` : `${-d} ago`}</td>
                      <td className={`${TD} num whitespace-nowrap text-right`}>{rm(s.tranche.target)}</td>
                      <td className={`${TD} num whitespace-nowrap text-right font-semibold`}>{rm(s.raised)}</td>
                      <td className={`${TD} num whitespace-nowrap text-right text-ink-2`}>{rm(s.gross)}</td>
                      <td className={`${TD} num text-right`}>{s.subscribers}</td>
                      <td className={TD}><span className="flex min-w-[130px] items-center gap-2"><span className="num w-10 font-semibold">{pct(s.fulfilment, 0)}</span><span className="flex-1"><Progress value={s.fulfilment} tone={s.risk === 'Critical' || s.risk === 'Attention' ? 'crit' : 'accent'} /></span></span></td>
                      <td className={`${TD} num whitespace-nowrap text-right text-ink-2`}>{s.dailyPace !== null ? `${rm(s.dailyPace)}/day` : '—'}</td>
                      <td className={TD}><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ${st.cls}`}><span className="h-2 w-2 rounded-full bg-current" aria-hidden />{st.label}</span></td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Step({ state, when, text }: { state: StepState; when: string | null; text?: string }) {
  const cfg = {
    done: { Icon: CircleCheck, cls: 'text-good', label: when ? dateShort(when) : 'Done' },
    'in progress': { Icon: Hourglass, cls: 'text-warn', label: text ?? 'In progress' },
    blocked: { Icon: AlertTriangle, cls: 'text-crit', label: 'On hold' },
    'not started': { Icon: Minus, cls: 'text-ink-3', label: text ?? 'Not started' },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium ${cfg.cls}`}>
      <cfg.Icon size={15} aria-hidden />{cfg.label}<span className="sr-only"> ({state})</span>
    </span>
  );
}

/** Post-close workflow per tranche: confirm → mint → allocate → release funds to issuer. */
export function AllocationTracker() {
  const { openDrawer } = useApp();
  const rows = allocationTracker();
  return (
    <Panel icon={Coins} iconTile="violet" title="Allocation & minting" info="After a tranche closes: confirm successful subscribers, mint the tokens, allocate them to investor wallets, then release funds to the issuer. Synthetic workflow data.">
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-[13px]">
          <caption className="sr-only">Allocation and minting progress by tranche</caption>
          <thead><tr>
            {['Tranche', 'Closed', 'Investors', '1 · Confirm', '2 · Mint', '3 · Allocate', '4 · Release funds', 'Note'].map((h, i) => (
              <th key={h} scope="col" className={`${TH} ${i === 2 ? 'text-right' : ''} ${i === 0 ? 'rounded-l-lg' : ''} ${i === 7 ? 'rounded-r-lg' : ''}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tranche.id} tabIndex={0} onClick={() => openDrawer({ kind: 'tranche', id: r.tranche.id })}
                onKeyDown={(e) => { if (e.key === 'Enter') openDrawer({ kind: 'tranche', id: r.tranche.id }); }}
                className="cursor-pointer hover:bg-sunken/70 focus-visible:bg-sunken focus-visible:outline-none">
                <td className={TD}><span className="whitespace-nowrap"><span className="block font-semibold">{r.tranche.id}</span><span className="block text-[12px] text-ink-3">{r.tranche.name}</span></span></td>
                <td className={`${TD} num whitespace-nowrap`}>{date(r.tranche.closeDate)}</td>
                <td className={`${TD} num text-right`}>{r.investors}</td>
                <td className={TD}><Step state={r.steps.confirm} when={r.confirmedOn} /></td>
                <td className={TD}><Step state={r.steps.mint} when={r.mintedOn} /></td>
                <td className={TD}><Step state={r.steps.allocate} when={r.allocatedOn} text={r.steps.allocate === 'in progress' ? `${r.allocated}/${r.investors} done` : undefined} /></td>
                <td className={TD}><Step state={r.steps.release} when={r.releasedOn} text={r.steps.release === 'done' ? undefined : `Due ${dateShort(r.releaseDue)}`} /></td>
                <td className={`${TD} max-w-[320px] text-[12.5px] ${r.blocker ? 'text-ink-2' : 'text-ink-3'}`}>{r.blocker ?? 'Complete'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
