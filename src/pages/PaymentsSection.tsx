import { AlertTriangle } from 'lucide-react';
import { Fragment } from 'react';
import { StatusBadge } from '../components/ui/Badge';
import { Card, InfoTip, Progress } from '../components/ui/Primitives';
import { daysFromAsOf } from '../data/asOf';
import { date, pct, relDays, rm } from '../lib/format';
import { issuerShort } from '../lib/selectors/finance';
import { paymentsView } from '../lib/selectors/operations';
import { useApp } from '../state/AppState';

const TH = 'whitespace-nowrap border-b border-line bg-sunken px-3 py-2.5 text-[11.5px] font-semibold text-ink-2';
const TD = 'border-b border-line/70 px-3 py-2.5';

/** Profit payments and principal repayments: what is due, whether the issuer has paid us, and whether investors are repaid. */
export function PaymentsSection() {
  const { thresholds, openDrawer } = useApp();
  const rows = paymentsView(thresholds);
  const upcoming = rows.filter((r) => r.status !== 'Paid');
  const done = rows.filter((r) => r.status === 'Paid').reverse();
  const groups: [string, typeof rows][] = [['Upcoming payments', upcoming], ['Completed', done]];

  return (
    <Card bodyClass="p-0" title={<span className="flex items-center gap-2">Redemptions & payments <InfoTip wide text="Profit payments and principal repayments to investors. Issuer funds must be received before investors are paid; a shortfall is flagged when a payment is due within 30 days and the issuer has not paid in full. Synthetic schedule." /></span>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left text-[13px]">
          <caption className="sr-only">Redemptions and payments schedule</caption>
          <thead><tr>
            {['Due date', 'Tranche', 'Payment', 'Amount due', 'Issuer funds received', 'Investors repaid', 'Status'].map((h, i) => (
              <th key={h} scope="col" className={`${TH} ${i === 3 ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {groups.map(([label, list]) => list.length > 0 && (
              <Fragment key={label}>
                <tr aria-hidden><td colSpan={7} className="bg-canvas px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">{label}</td></tr>
                {list.map((p) => {
                  const d = daysFromAsOf(p.dueDate);
                  const share = p.amountDue ? p.received / p.amountDue : 0;
                  return (
                    <tr key={p.id} tabIndex={0} onClick={() => openDrawer({ kind: 'tranche', id: p.trancheId })}
                      onKeyDown={(e) => { if (e.key === 'Enter') openDrawer({ kind: 'tranche', id: p.trancheId }); }}
                      className="cursor-pointer hover:bg-sunken/70 focus-visible:bg-sunken focus-visible:outline-none">
                      <td className={`${TD} whitespace-nowrap`}><span className="num font-semibold">{date(p.dueDate)}</span>{p.status !== 'Paid' && <span className={`block text-[11.5px] ${d <= 30 ? 'text-warn' : 'text-ink-3'}`}>{relDays(d)}</span>}</td>
                      <td className={TD}><span className="whitespace-nowrap"><span className="block font-medium">{p.tranche.name}</span><span className="block text-[11.5px] text-ink-3">{issuerShort(p.tranche.issuerId)}</span></span></td>
                      <td className={`${TD} whitespace-nowrap`}>{p.type}</td>
                      <td className={`${TD} num whitespace-nowrap text-right font-semibold`}>{rm(p.amountDue)}</td>
                      <td className={TD}>
                        <span className="flex min-w-[260px] items-center gap-2.5">
                          <span className="num w-36 shrink-0 whitespace-nowrap text-[12.5px]">{share >= 1 ? 'Received' : share > 0 ? `${pct(share, 0)} · ${rm(p.received)}` : 'Not yet'}</span>
                          <span className="flex-1"><Progress value={share} tone={share >= 1 ? 'good' : p.shortfall ? 'crit' : 'mute'} label="Issuer funds received" /></span>
                        </span>
                        {p.shortfall > 0 && <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-crit"><AlertTriangle size={13} aria-hidden />Shortfall {rm(p.shortfall)}</span>}
                      </td>
                      <td className={`${TD} num whitespace-nowrap`}>{p.investorsPaidCount}/{p.investorsTotal} {p.investorsPaidCount === p.investorsTotal ? 'paid' : 'investors'}</td>
                      <td className={TD}><StatusBadge status={p.status === 'Paid' ? 'Paid' : p.shortfall ? 'Shortfall' : p.status === 'Due' ? 'Due soon' : 'Scheduled'} tone={p.status === 'Paid' ? 'good' : p.shortfall ? 'crit' : p.status === 'Due' ? 'warn' : 'mute'} /></td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
