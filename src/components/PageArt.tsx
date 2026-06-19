import { memo, useMemo } from "react";
import type { Manga } from "@/lib/types";

/* Procedural manga page. Deterministic panel layout + halftone + speed lines,
   in ink-on-paper monochrome with a faint hue from the title's palette. Gives
   the reader real material to render for vertical / paged / immersive modes and
   exposes a density value so smart auto-scroll can slow on busy pages. */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Panel { x: number; y: number; w: number; h: number; }

function splitPanels(rng: () => number, target: number): Panel[] {
  let panels: Panel[] = [{ x: 0, y: 0, w: 100, h: 140 }];
  while (panels.length < target) {
    // split the largest panel
    panels.sort((a, b) => b.w * b.h - a.w * a.h);
    const p = panels.shift()!;
    const horizontal = p.w / p.h < 1.1 ? true : rng() > 0.55;
    const ratio = 0.38 + rng() * 0.24;
    if (horizontal) {
      const hh = p.h * ratio;
      panels.push({ ...p, h: hh }, { x: p.x, y: p.y + hh, w: p.w, h: p.h - hh });
    } else {
      const ww = p.w * ratio;
      panels.push({ ...p, w: ww }, { x: p.x + ww, y: p.y, w: p.w - ww, h: p.h });
    }
  }
  return panels;
}

export function pageDensity(seed: string): number {
  // 0..1 — derived from panel count, used by smart auto-scroll.
  const rng = mulberry32(hash(seed));
  return Math.min(1, (2 + Math.floor(rng() * 6)) / 8);
}

const GUTTER = 2.4;

function PageArtImpl({
  manga,
  chapterId,
  page,
}: {
  manga: Manga;
  chapterId: string;
  page: number;
}) {
  const seed = `${chapterId}:${page}`;
  const [hue] = manga.palette;

  const { panels, decos } = useMemo(() => {
    const rng = mulberry32(hash(seed));
    const count = 2 + Math.floor(rng() * 6);
    const ps = splitPanels(rng, count);
    const decos = ps.map((p) => {
      const r = rng();
      const tone = ["#ffffff", "#f2f2f4", "#e7e7ec", "#15161c", "#0c0d12"][Math.floor(rng() * 5)];
      const dark = tone.startsWith("#0") || tone.startsWith("#1");
      return {
        tone,
        dark,
        speed: r > 0.62,
        speedAngle: -30 + rng() * 60,
        bubble: rng() > 0.42,
        bx: p.x + p.w * (0.12 + rng() * 0.4),
        by: p.y + p.h * (0.12 + rng() * 0.35),
        bw: Math.min(p.w * 0.5, 24 + rng() * 14),
        figure: rng() > 0.5,
      };
    });
    return { panels: ps, decos };
  }, [seed]);

  return (
    <svg
      className="page-art"
      viewBox="0 0 100 140"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${manga.title} — page ${page + 1}`}
      style={{ "--page-hue": hue } as React.CSSProperties}
    >
      <defs>
        <pattern id={`tone-${seed}`} width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <rect width="2" height="2" fill="#fff" />
          <circle cx="1" cy="1" r="0.55" fill="#0c0d12" opacity="0.5" />
        </pattern>
        <linearGradient id={`fig-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`oklch(0.4 0.06 ${hue})`} />
          <stop offset="1" stopColor="#0a0b10" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="100" height="140" fill="#0a0b10" />

      {panels.map((p, i) => {
        const d = decos[i];
        const x = p.x + GUTTER / 2;
        const y = p.y + GUTTER / 2;
        const w = p.w - GUTTER;
        const h = p.h - GUTTER;
        const clip = `clip-${seed}-${i}`;
        return (
          <g key={i}>
            <clipPath id={clip}>
              <rect x={x} y={y} width={w} height={h} rx="0.6" />
            </clipPath>
            <g clipPath={`url(#${clip})`}>
              <rect x={x} y={y} width={w} height={h} fill={d.tone} />
              {!d.dark && d.figure && (
                <rect x={x} y={y + h * 0.18} width={w} height={h * 0.82} fill={`url(#tone-${seed})`} opacity="0.25" />
              )}
              {d.figure && (
                <ellipse
                  cx={x + w * 0.5}
                  cy={y + h * 0.78}
                  rx={w * 0.32}
                  ry={h * 0.5}
                  fill={`url(#fig-${seed})`}
                  opacity={d.dark ? 0.85 : 0.7}
                />
              )}
              {d.speed && (
                <g
                  stroke={d.dark ? "#fff" : "#111"}
                  strokeWidth="0.25"
                  opacity="0.5"
                  transform={`rotate(${d.speedAngle} ${x + w / 2} ${y + h / 2})`}
                >
                  {Array.from({ length: 9 }).map((_, k) => (
                    <line key={k} x1={x - 10 + k * (w / 7)} y1={y - 6} x2={x - 10 + k * (w / 7)} y2={y + h + 6} />
                  ))}
                </g>
              )}
              {d.bubble && (
                <g>
                  <ellipse cx={d.bx} cy={d.by} rx={d.bw / 2} ry={d.bw / 3.4} fill="#fff" stroke="#0c0d12" strokeWidth="0.4" />
                  {[0, 1, 2].map((k) => (
                    <line
                      key={k}
                      x1={d.bx - d.bw / 3.4}
                      y1={d.by - 1.6 + k * 1.6}
                      x2={d.bx + d.bw / 3.6}
                      y2={d.by - 1.6 + k * 1.6}
                      stroke="#0c0d12"
                      strokeWidth="0.45"
                      opacity="0.7"
                    />
                  ))}
                </g>
              )}
            </g>
            <rect x={x} y={y} width={w} height={h} rx="0.6" fill="none" stroke="#05060a" strokeWidth="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

export const PageArt = memo(PageArtImpl);
