import type { Manga, Genre } from "./types";
import { CATALOG } from "@/data/catalog";

/* ============================================================
   Recommendation engine.
   A user is a sparse weighted vector over genres + tags + demographic.
   Signal sources, by descending trust:
     explicit picks (onboarding)  > favorites > finished/long reads
     > brief reads > abandons (negative).
   Compatibility = cosine(user, manga) shaped into a confident 0–100.
   ============================================================ */

export interface TasteProfile {
  genres: Record<string, number>;
  tags: Record<string, number>;
  demo: Record<string, number>;
  /** Reading-speed preference in seconds/page; used for auto-scroll defaults. */
  avgSecondsPerPage: number;
  samples: number;
}

export interface BehaviorSignal {
  favorites: string[];
  finished: string[];
  reading: { mangaId: string; progress: number }[]; // progress 0..1
  abandoned: string[];
  picks: string[];
}

export const EMPTY_PROFILE: TasteProfile = {
  genres: {}, tags: {}, demo: {}, avgSecondsPerPage: 8, samples: 0,
};

function add(map: Record<string, number>, key: string, w: number) {
  map[key] = (map[key] ?? 0) + w;
}

function ingest(p: TasteProfile, m: Manga, weight: number) {
  for (const g of m.genres) add(p.genres, g, weight);
  for (const t of m.tags) add(p.tags, t, weight * 0.6);
  add(p.demo, m.demographic, weight * 0.4);
  p.samples += Math.max(0, weight);
}

export function buildProfile(signal: BehaviorSignal): TasteProfile {
  const p: TasteProfile = { genres: {}, tags: {}, demo: {}, avgSecondsPerPage: 8, samples: 0 };
  const byId = new Map(CATALOG.map((m) => [m.id, m]));
  const get = (id: string) => byId.get(id);

  for (const id of signal.picks) { const m = get(id); if (m) ingest(p, m, 3); }
  for (const id of signal.favorites) { const m = get(id); if (m) ingest(p, m, 2.4); }
  for (const id of signal.finished) { const m = get(id); if (m) ingest(p, m, 2); }
  for (const r of signal.reading) {
    const m = get(r.mangaId);
    if (m) ingest(p, m, 0.6 + r.progress * 1.6);
  }
  for (const id of signal.abandoned) { const m = get(id); if (m) ingest(p, m, -1.3); }
  return p;
}

function dot(a: Record<string, number>, b: Record<string, number>): number {
  let s = 0;
  for (const k in a) if (b[k]) s += a[k] * b[k];
  return s;
}
function norm(a: Record<string, number>): number {
  let s = 0;
  for (const k in a) s += a[k] * a[k];
  return Math.sqrt(s);
}

function mangaVector(m: Manga) {
  const genres: Record<string, number> = {};
  const tags: Record<string, number> = {};
  const demo: Record<string, number> = {};
  for (const g of m.genres) genres[g] = 1;
  for (const t of m.tags) tags[t] = 0.6;
  demo[m.demographic] = 0.4;
  return { genres, tags, demo };
}

/** 0..100 compatibility. Cosine across the three spaces, then a gentle
 *  curve so good matches read as the confident high-90s Netflix shows,
 *  while still leaving headroom. Falls back to quality-based score when
 *  the profile is empty (cold start). */
export function compatibility(m: Manga, p: TasteProfile): number {
  if (p.samples <= 0) return Math.round(58 + (m.rating - 7.5) * 12 + (m.popularity - 50) * 0.12);
  const v = mangaVector(m);
  const denom =
    (norm(p.genres) * norm(v.genres) || 1) +
    (norm(p.tags) * norm(v.tags) || 1) +
    (norm(p.demo) * norm(v.demo) || 1);
  const sim =
    (dot(p.genres, v.genres) + dot(p.tags, v.tags) + dot(p.demo, v.demo)) / denom;
  const clamped = Math.max(0, Math.min(1, sim));
  // Curve: emphasise the top end, add a small quality nudge.
  const shaped = Math.pow(clamped, 0.62);
  const quality = (m.rating - 8) * 1.4;
  return Math.round(Math.max(31, Math.min(99, 46 + shaped * 52 + quality)));
}

export interface Rail {
  id: string;
  title: string;
  subtitle?: string;
  items: Manga[];
  kind?: "standard" | "spotlight";
}

const hasGenre = (m: Manga, g: Genre) => m.genres.includes(g);

/** Build the dynamic home. Order and contents shift with the profile, so two
 *  users never see the same home. Excludes titles already in progress from the
 *  discovery rails (those live in "Continue"). */
export function buildHomeRails(
  profile: BehaviorSignal,
  taste: TasteProfile,
): Rail[] {
  const inProgress = new Set(profile.reading.map((r) => r.mangaId));
  const scored = CATALOG.map((m) => ({ m, score: compatibility(m, taste) }))
    .sort((a, b) => b.score - a.score);

  const rails: Rail[] = [];

  const forYou = scored.filter((s) => !inProgress.has(s.m.id)).slice(0, 12).map((s) => s.m);
  if (forYou.length) {
    rails.push({ id: "for-you", title: "Recommandé pour vous", subtitle: "Calculé à partir de vos goûts", items: forYou, kind: "spotlight" });
  }

  // "Parce que vous avez aimé X" — anchored on the strongest signal.
  const anchorId = profile.picks[0] ?? profile.favorites[0] ?? profile.finished[0];
  const byId = new Map(CATALOG.map((m) => [m.id, m]));
  const anchor = anchorId ? byId.get(anchorId) : undefined;
  if (anchor) {
    const anchorGenres = new Set(anchor.genres);
    const because = CATALOG.filter(
      (m) => m.id !== anchor.id && m.genres.some((g) => anchorGenres.has(g)),
    )
      .map((m) => ({ m, s: compatibility(m, taste) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .map((x) => x.m);
    if (because.length >= 4) {
      rails.push({ id: `because-${anchor.id}`, title: `Parce que vous avez aimé ${anchor.title}`, items: because });
    }
  }

  rails.push({
    id: "trending", title: "Tendances",
    items: [...CATALOG].sort((a, b) => b.popularity - a.popularity).slice(0, 10),
  });
  rails.push({
    id: "new", title: "Nouveautés",
    items: [...CATALOG].sort((a, b) => b.year - a.year).slice(0, 10),
  });
  // Pépites cachées: highly rated but under-read.
  rails.push({
    id: "gems", title: "Pépites cachées", subtitle: "Adorées, encore confidentielles",
    items: CATALOG.filter((m) => m.rating >= 8.4 && m.popularity < 55)
      .sort((a, b) => b.rating - a.rating).slice(0, 10),
  });

  // Genre rails, ordered by the user's own top genres.
  const topGenres = (Object.entries(taste.genres) as [Genre, number][])
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  const genreOrder: Genre[] = topGenres.length
    ? [...new Set([...topGenres, "Action", "Romance", "Dark Fantasy", "Psychological", "Sport"] as Genre[])]
    : (["Dark Fantasy", "Romance", "Action", "Psychological", "Sport", "Sci-Fi"] as Genre[]);

  for (const g of genreOrder.slice(0, 6)) {
    const items = CATALOG.filter((m) => hasGenre(m, g))
      .map((m) => ({ m, s: compatibility(m, taste) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.m);
    if (items.length >= 4) rails.push({ id: `genre-${g}`, title: g, items });
  }

  return rails;
}

/** Ordered feed for the TikTok-style discovery surface. */
export function buildDiscoveryFeed(profile: BehaviorSignal, taste: TasteProfile): Manga[] {
  const seen = new Set([...profile.reading.map((r) => r.mangaId), ...profile.finished, ...profile.abandoned]);
  const fresh = CATALOG.filter((m) => !seen.has(m.id));
  const pool = fresh.length >= 8 ? fresh : CATALOG;
  // Weighted shuffle: compatibility decides the odds, randomness keeps it alive.
  return pool
    .map((m) => ({ m, key: compatibility(m, taste) + Math.random() * 26 }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.m);
}
