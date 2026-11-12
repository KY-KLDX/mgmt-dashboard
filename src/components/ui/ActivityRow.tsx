import { ChevronRight } from 'lucide-react';
import { INVESTORS } from '../../data/investors';
import { dateShort, rm } from '../../lib/format';
import { investorShortLabel } from '../../lib/identity';
import type { ActivityEvent, ActivityTab, ActivityTag } from '../../lib/selectors/activity';

export const ACTIVITY_TABS: { key: ActivityTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'topups', label: 'Top-ups' },
  { key: 'manual', label: 'Manual deposits' },
  { key: 'profile', label: 'Profile updates' },
];

const TAG: Record<ActivityTag, { pill: string; dot: string }> = {
  'Top-up': { pill: 'bg-good-soft text-good', dot: 'bg-good' },
  'Manual deposit': { pill: 'bg-info-soft text-info', dot: 'bg-info' },
  Subscription: { pill: 'bg-violet-soft text-violet', dot: 'bg-violet' },
  Withdrawal: { pill: 'bg-mute-soft text-mute', dot: 'bg-mute' },
  Payout: { pill: 'bg-mute-soft text-mute', dot: 'bg-mute' },
  Onboarding: { pill: 'bg-accent-soft text-accent-ink', dot: 'bg-accent' },
  'Profile update': { pill: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  Pending: { pill: 'bg-sunken text-ink-2', dot: 'bg-mute' },
  Failed: { pill: 'bg-crit-soft text-crit', dot: 'bg-crit' },
};

const labelOf = new Map(INVESTORS.map((i) => [i.id, investorShortLabel(i)]));

/** One feed line: dot, investor over what happened, amount, tag, date and time. */
export function ActivityRow({ e, onOpen }: { e: ActivityEvent; onOpen: () => void }) {
  const t = e.tag === 'Profile update' && e.flag ? { pill: 'bg-crit-soft text-crit', dot: 'bg-crit' } : TAG[e.tag];
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken/70">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="num block truncate text-[13.5px] font-semibold">{labelOf.get(e.investorId)}</span>
        <span className="block truncate text-[12px] text-ink-3">{e.text}</span>
      </span>
      <span className="num hidden w-28 shrink-0 text-right text-[13.5px] font-semibold sm:block">{e.amount ? rm(e.amount) : ''}</span>
      <span className={`hidden w-[118px] shrink-0 sm:flex`}>
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${t.pill}`}>
          {e.tag === 'Profile update' && e.flag ? 'Needs review' : e.tag}
        </span>
      </span>
      <span className="num w-[92px] shrink-0 text-right text-[12px] text-ink-3">{dateShort(e.date)}, {e.time}</span>
      <ChevronRight size={15} className="shrink-0 text-ink-3" aria-hidden />
    </button>
  );
}
