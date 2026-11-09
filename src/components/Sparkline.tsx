interface Props { values: number[]; label: string }

export default function Sparkline({ values, label }: Props) {
  if (values.length < 2) return null;
  const low = Math.min(...values); const spread = Math.max(...values) - low;
  const points = values.map((value, index) => `${2 + index * 52 / (values.length - 1)},${19 - (spread === 0 ? 0.5 : (value - low) / spread) * 16}`).join(' ');
  return <svg className="wait-sparkline" viewBox="0 0 56 22" width="56" height="22" role="img" aria-label={`${label}: ${values.join(', ')} weeks. Each sparkline uses its own vertical scale.`}>
    <path d="M2 21H54" fill="none" stroke="currentColor" opacity="0.18" />
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>;
}
