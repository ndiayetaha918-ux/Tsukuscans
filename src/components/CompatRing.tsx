import "./CompatRing.css";

/* Compatibility score as a thin aurora ring. The spectrum gradient is one of
   the few places the reserved aurora palette is allowed to appear. */
export function CompatRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const id = `cr${Math.round(score)}-${size}`;
  return (
    <div className="compat" style={{ width: size, height: size }} title={`Compatibilité ${score}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="compat__svg">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="oklch(0.7 0.2 318)" />
            <stop offset="0.5" stopColor="oklch(0.62 0.19 278)" />
            <stop offset="1" stopColor="oklch(0.8 0.13 214)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(1 0 0 / 0.1)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="compat__num" style={{ fontSize: size * 0.3 }}>
        {score}
        <span className="compat__pct">%</span>
      </div>
    </div>
  );
}
