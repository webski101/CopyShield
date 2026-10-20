interface Props {
  series: Array<[number, number]>;
  stroke?: string;
  fill?: string;
}

export function Sparkline({
  series,
  stroke = "#c8f542",
  fill = "rgba(200,245,66,0.12)",
}: Props) {
  if (!series.length) return <svg className="spark" />;
  const values = series.map(([, v]) => v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-6, max - min);
  const w = 320;
  const h = 72;
  const pts = series
    .map(([, v], i) => {
      const x = (i / Math.max(1, series.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={area} fill={fill} stroke="none" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}
