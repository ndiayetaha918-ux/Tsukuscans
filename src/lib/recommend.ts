import type { Manga, TasteSeed } from "./types";

/* Taste = weighted vector over genre + theme tag names, learned from the
   onboarding picks and favourites. Compatibility = cosine(title, taste),
   shaped into a confident 0–100 like a streaming match score. */

export interface Taste {
  weights: Record<string, number>;
  topGenres: string[];
  samples: number;
}

export function buildTaste(seeds: TasteSeed[], favorites: TasteSeed[] = []): Taste {
  const weights: Record<string, number> = {};
  const genreCount: Record<string, number> = {};
  const add = (names: string[], w: number, isGenre: boolean) => {
    for (const n of names) {
      weights[n] = (weights[n] ?? 0) + w;
      if (isGenre) genreCount[n] = (genreCount[n] ?? 0) + w;
    }
  };
  for (const s of seeds) {
    add(s.genres, 3, true);
    add(s.tags, 1.6, false);
  }
  for (const f of favorites) {
    add(f.genres, 2, true);
    add(f.tags, 1.1, false);
  }
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  return { weights, topGenres, samples: seeds.length + favorites.length };
}

function norm(v: Record<string, number>): number {
  let s = 0;
  for (const k in v) s += v[k] * v[k];
  return Math.sqrt(s) || 1;
}

export function compatibility(m: Manga, taste: Taste): number {
  if (taste.samples <= 0) {
    // cold start: lean on quality/popularity
    const base = 62 + (m.rating ? (m.rating - 7.5) * 9 : 0);
    return Math.max(40, Math.min(97, Math.round(base)));
  }
  const tv: Record<string, number> = {};
  for (const g of m.genres) tv[g] = 1;
  for (const t of m.tags) tv[t] = 0.6;
  let dot = 0;
  for (const k in tv) if (taste.weights[k]) dot += tv[k] * taste.weights[k];
  const sim = dot / (norm(tv) * norm(taste.weights));
  const shaped = Math.pow(Math.max(0, Math.min(1, sim)), 0.6);
  const quality = m.rating ? (m.rating - 8) * 1.2 : 0;
  return Math.max(38, Math.min(99, Math.round(48 + shaped * 50 + quality)));
}

export function dedupe(lists: Manga[][], exclude: Set<string> = new Set()): Manga[] {
  const seen = new Set(exclude);
  const out: Manga[] = [];
  for (const list of lists) for (const m of list) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}
