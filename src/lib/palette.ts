/* Palette engine — derives a small, hierarchical colour set from a single
   dominant colour (AniList coverImage.color) so the LightField can diffuse
   one dominant + two secondaries + one accent, never a flat wash. */

function hexToHsl(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsl(${Math.round((h % 360 + 360) % 360)} ${Math.round(Math.max(0, Math.min(100, s * 100)))}% ${Math.round(Math.max(0, Math.min(100, l * 100)))}% / ${a})`;

export interface ContentPalette {
  dom: string;   // dominant wash
  sec1: string;  // secondary bloom
  sec2: string;  // secondary bloom (opposite drift)
  acc: string;   // bright spill near the focal
}

function hueFromId(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

/** Build a diffusion palette from a hex (or fall back to a deterministic hue). */
export function derivePalette(hex?: string, id = ""): ContentPalette {
  const parsed = hex ? hexToHsl(hex) : null;
  // No content colour → a dim, near-neutral cool glow, NOT a coloured tint.
  if (!parsed) {
    const h = hueFromId(id || "x");
    return {
      dom: hsl(h, 0.12, 0.4, 0.18),
      sec1: hsl(h + 40, 0.12, 0.42, 0.14),
      sec2: hsl(h - 40, 0.1, 0.36, 0.12),
      acc: hsl(h, 0.14, 0.5, 0.18),
    };
  }
  const h = parsed[0];
  const s = Math.max(0.45, Math.min(0.9, parsed[1] || 0.6));
  return {
    // boost saturation, control lightness ourselves so it always reads as "light"
    dom: hsl(h, s, 0.5, 0.5),
    sec1: hsl(h + 32, s * 0.95, 0.55, 0.42),
    sec2: hsl(h - 46, s * 0.9, 0.45, 0.38),
    acc: hsl(h + 12, Math.min(1, s + 0.1), 0.62, 0.55),
  };
}
