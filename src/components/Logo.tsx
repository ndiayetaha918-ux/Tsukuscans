import "./Logo.css";

/* Tsuki logomark: a vermillion hanko (seal) with a carved crescent moon —
   the manga red-stamp made into a moon. Doubles as the app/PWA icon. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="logomark" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <mask id="tsuki-crescent">
          <rect width="48" height="48" fill="#000" />
          <circle cx="23" cy="24" r="12" fill="#fff" />
          <circle cx="30" cy="19.5" r="10.5" fill="#000" />
        </mask>
      </defs>
      <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" fill="#d8412a" />
      <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" fill="#000" opacity="0.06" />
      <rect width="48" height="48" fill="#fdf1e7" mask="url(#tsuki-crescent)" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo__word">Tsuki</span>
    </span>
  );
}
