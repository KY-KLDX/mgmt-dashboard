import { AlertOctagon, AlertTriangle, CheckCircle2, Circle, Clock, Info, MinusCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type Tone = 'crit' | 'warn' | 'good' | 'info' | 'mute' | 'accent';

const TONE_CLS: Record<Tone, string> = {
  crit: 'bg-crit-soft text-crit ring-crit/25',
  warn: 'bg-warn-soft text-warn ring-warn/25',
  good: 'bg-good-soft text-good ring-good/25',
  info: 'bg-info-soft text-info ring-info/20',
  mute: 'bg-mute-soft text-mute ring-mute/20',
  accent: 'bg-accent-soft text-accent-ink ring-accent/25',
};

const TONE_ICON: Record<Tone, LucideIcon> = {
  crit: AlertOctagon,
  warn: AlertTriangle,
  good: CheckCircle2,
  info: Info,
  mute: MinusCircle,
  accent: Circle,
};

/** Status pill: colour is always paired with an icon and a text label. */
export function Badge({ tone, children, icon, title }: { tone: Tone; children: ReactNode; icon?: LucideIcon | null; title?: string }) {
  const Icon = icon === null ? null : (icon ?? TONE_ICON[tone]);
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset ${TONE_CLS[tone]}`}>
      {Icon && <Icon size={12} strokeWidth={2.25} aria-hidden />}
      {children}
    </span>
  );
}

export function toneFor(label: string): Tone {
  const l = label.toLowerCase();
  if (['critical', 'overdue', 'failed', 'blocked', 'rejected', 'worsening'].some((k) => l.includes(k))) return 'crit';
  if (['high', 'at risk', 'attention', 'due soon', 'awaiting', 'investigating', 'contained', 'incomplete', 'medium', 'pending', 'under review'].some((k) => l.includes(k))) return 'warn';
  if (['on track', 'completed', 'complete', 'approved', 'closed', 'resolved', 'active', 'endorsed', 'noted', 'improving', 'successful', 'issued', 'fully subscribed', 'pass', 'allocated'].some((k) => l.includes(k))) return 'good';
  if (['open', 'monitoring', 'in progress', 'scheduled', 'submitted', 'review', 'drafting', 'ready'].some((k) => l.includes(k))) return 'info';
  return 'mute';
}

export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  const t = tone ?? toneFor(status);
  const icon = t === 'info' ? Clock : undefined;
  return (
    <Badge tone={t} icon={icon}>
      {status}
    </Badge>
  );
}

const SEV_TONE: Record<string, Tone> = { Critical: 'crit', High: 'warn', Medium: 'info', Low: 'mute', Informational: 'mute' };

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge tone={SEV_TONE[severity] ?? 'mute'}>{severity}</Badge>;
}

export function severityStripe(severity: string): string {
  return severity === 'Critical' ? 'bg-crit' : severity === 'High' ? 'bg-warn' : severity === 'Medium' ? 'bg-info' : 'bg-mute/50';
}
