import "./Logo.css";

/* Tsuki logomark: a crescent moon carved from a single shape, paired with a
   tight display wordmark. The mark doubles as the app/PWA icon. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg className="logomark" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tsuki-moon" x1="8" y1="6" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dcccff" />
          <stop offset="0.55" stopColor="#8a63ef" />
          <stop offset="1" stopColor="#5a36c9" />
        </linearGradient>
        <mask id="tsuki-crescent">
          <rect width="48" height="48" fill="#000" />
          <circle cx="24" cy="24" r="18" fill="#fff" />
          <circle cx="33" cy="18" r="15.5" fill="#000" />
        </mask>
      </defs>
      <rect width="48" height="48" fill="url(#tsuki-moon)" mask="url(#tsuki-crescent)" />
      <circle cx="17.5" cy="20" r="1.6" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo__word">Tsuki</span>
    </span>
  );
}
