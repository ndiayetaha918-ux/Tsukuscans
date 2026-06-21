import type { Chapter } from "./types";

/* Static reading library — the zero-setup reading path.

   A scheduled GitHub Action pre-fetches FR chapter metadata (content hash + page
   filenames) for popular titles into /library/*.json on this same site. We read
   it here (same-origin, no CORS) and display pages by hotlinking the STABLE host
   uploads.mangadex.org via <img> — no API call, no relay, no deploy. */

const BASE = import.meta.env.BASE_URL || "/";
const UPLOADS = "https://uploads.mangadex.org";

interface LibIndex {
  updatedAt: string;
  count: number;
  byAnilist: Record<string, string>;
  byTitle: Record<string, string>;
  titles: { id: string; title: string; cover?: string; anilist?: string; chapters: number; from: string; to: string }[];
}
interface LibTitle {
  id: string;
  title: string;
  chapters: { id: string; chapter: string; title: string; group?: string; lang: string; publishAt: string; pages: number; hash: string; files: string[] }[];
}

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

let indexPromise: Promise<LibIndex | null> | null = null;
function loadIndex(): Promise<LibIndex | null> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}library/index.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return indexPromise;
}

const titleCache = new Map<string, Promise<LibTitle | null>>();
function loadTitle(mdId: string): Promise<LibTitle | null> {
  let p = titleCache.get(mdId);
  if (!p) {
    p = fetch(`${BASE}library/${mdId}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    titleCache.set(mdId, p);
  }
  return p;
}

/** Is the static library available at all (built + deployed)? */
export async function libraryReady(): Promise<boolean> {
  const idx = await loadIndex();
  return !!idx && idx.count > 0;
}

export interface ReadableTitle {
  anilist: string;
  title: string;
  cover?: string;
  chapters: number;
  from: string;
  to: string;
}

/** Titles readable right now (zero setup), navigable via their AniList id. */
export async function readableTitles(): Promise<ReadableTitle[]> {
  const idx = await loadIndex();
  if (!idx) return [];
  return idx.titles
    .filter((t) => t.anilist)
    .map((t) => ({ anilist: t.anilist!, title: t.title, cover: t.cover, chapters: t.chapters, from: t.from, to: t.to }));
}

/** Resolve an AniList work to a MangaDex id present in the library. */
async function resolveId(opts: { anilistId?: string; titles?: string[] }): Promise<string | null> {
  const idx = await loadIndex();
  if (!idx) return null;
  if (opts.anilistId && idx.byAnilist[opts.anilistId]) return idx.byAnilist[opts.anilistId];
  for (const t of opts.titles || []) {
    const k = norm(t);
    if (k && idx.byTitle[k]) return idx.byTitle[k];
  }
  return null;
}

/** Chapters for a work from the static library, or [] if not covered. */
export async function findStaticChapters(opts: { anilistId?: string; titles?: string[] }): Promise<Chapter[]> {
  const mdId = await resolveId(opts);
  if (!mdId) return [];
  const data = await loadTitle(mdId);
  if (!data?.chapters?.length) return [];
  return data.chapters.map((c) => ({
    id: c.id,
    chapter: c.chapter,
    title: c.title,
    pages: c.pages,
    publishAt: c.publishAt,
    group: c.group,
    lang: c.lang,
    source: "static" as const,
    hash: c.hash,
    files: c.files,
  }));
}

/** Page image URLs for a static chapter (hotlinked, CORS-exempt). */
export function staticPages(chapter: Chapter): string[] {
  if (!chapter.hash || !chapter.files) return [];
  return chapter.files.map((f) => `${UPLOADS}/data/${chapter.hash}/${f}`);
}
