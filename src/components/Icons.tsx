import type { SVGProps } from "react";

/* One coherent icon set: 24px grid, 1.6 stroke, round caps. */
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type P = SVGProps<SVGSVGElement>;

export const HomeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></svg>
);
export const CompassIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>
);
export const SearchIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);
export const LibraryIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 5v14" /><path d="M9 4v16" /><rect x="13" y="4" width="7" height="16" rx="1.2" /></svg>
);
export const UserIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base} {...p} fill="currentColor" stroke="none"><path d="M7 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 7 5.5Z" /></svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 6.5" /></svg>
);
export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 4v11" /><path d="m7.5 11 4.5 4 4.5-4" /><path d="M5 20h14" /></svg>
);
export const HeartIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 20s-7-4.5-9.2-9C1.3 8 2.6 4.8 6 4.8c2 0 3.2 1.3 4 2.5.8-1.2 2-2.5 4-2.5 3.4 0 4.7 3.2 3.2 6.2C19 15.5 12 20 12 20Z" /></svg>
);
export const ChevronLeft = (p: P) => (
  <svg {...base} {...p}><path d="m14 6-6 6 6 6" /></svg>
);
export const ChevronRight = (p: P) => (
  <svg {...base} {...p}><path d="m10 6 6 6-6 6" /></svg>
);
export const ChevronDown = (p: P) => (
  <svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>
);
export const SettingsIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
);
export const BellIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10.5 19a1.5 1.5 0 0 0 3 0" /></svg>
);
export const SparkIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3c.5 3.5 2.5 5.5 6 6-3.5.5-5.5 2.5-6 6-.5-3.5-2.5-5.5-6-6 3.5-.5 5.5-2.5 6-6Z" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const MoreIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
);
export const LayersIcon = (p: P) => (
  <svg {...base} {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
);
export const StarIcon = (p: P) => (
  <svg {...base} {...p} fill="currentColor" stroke="none"><path d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.1L12 16.9 7.4 18.3l.9-5.1L4.5 9.5l5.2-.8L12 4Z" /></svg>
);
