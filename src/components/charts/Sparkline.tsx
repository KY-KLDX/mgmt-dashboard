/** Minimal inline sparkline: area fill, 2px line, emphasised endpoint. */
export function Sparkline({ values, width = 76, height = 28 }: { values: number[]; width?: number; height?: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <path d={area} fill="var(--series-2)" opacity={0.12} />
      <path d={line} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r={3} fill="var(--series-2)" stroke="rgb(var(--surface))" strokeWidth={1.5} />
    </svg>
  );
}
