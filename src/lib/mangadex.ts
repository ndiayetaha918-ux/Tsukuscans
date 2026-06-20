import type { Chapter } from "./types";

/* MangaDex is used only for actual reading (chapter list + page images),
   looked up by title from the AniList catalogue. Best-effort: if MangaDex is
   unreachable, the reader degrades gracefully while browsing stays on AniList. */

const API = "https://api.mangadex.org";
const CONTENT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

const PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rawFetch<T>(url: string, timeout = 6000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`MangaDex ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

async function getJSON<T>(url: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await rawFetch<T>(url); }
    catch (e) { lastErr = e; if (attempt === 0) await delay(350); }
  }
  for (const proxy of PROXIES) {
    try { return await rawFetch<T>(proxy(url)); } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error("MangaDex indisponible");
}

interface MDList<T> { data: T[] }
interface MDChapter {
  id: string;
  attributes: { chapter: string | null; title: string | null; pages: number; publishAt: string; translatedLanguage: string };
  relationships: { type: string; attributes?: Record<string, unknown> }[];
}

/** Find a MangaDex manga id by title (best match). */
async function findMangaId(title: string): Promise<string | null> {
  const url = `${API}/manga?title=${encodeURIComponent(title)}&limit=1&${CONTENT}&order[relevance]=desc`;
  const j = await getJSON<MDList<{ id: string }>>(url);
  return j.data[0]?.id ?? null;
}

async function feed(id: string, lang: string): Promise<Chapter[]> {
  const url = `${API}/manga/${id}/feed?translatedLanguage[]=${lang}&${CONTENT}&order[volume]=asc&order[chapter]=asc&limit=200&includes[]=scanlation_group`;
  const j = await getJSON<MDList<MDChapter>>(url);
  const seen = new Set<string>();
  const out: Chapter[] = [];
  for (const c of j.data) {
    const num = c.attributes.chapter ?? "";
    if (num && seen.has(num)) continue;
    if (num) seen.add(num);
    const group = c.relationships.find((r) => r.type === "scanlation_group");
    out.push({
      id: c.id,
      chapter: num || "—",
      title: c.attributes.title || (num ? `Chapitre ${num}` : "Oneshot"),
      pages: c.attributes.pages,
      publishAt: c.attributes.publishAt,
      group: (group?.attributes?.name as string) || undefined,
      lang: c.attributes.translatedLanguage,
    });
  }
  return out;
}

/** Chapters for a title, preferring French scans (e.g. colour manhwa teams
 *  like Little Garden) and falling back to English. Empty if not on MangaDex. */
export async function findChaptersByTitle(title: string): Promise<Chapter[]> {
  const id = await findMangaId(title);
  if (!id) return [];
  const fr = await feed(id, "fr");
  if (fr.length > 0) return fr;
  return feed(id, "en");
}

/** Full page image URLs for a chapter via the at-home server. */
export async function getChapterPages(chapterId: string): Promise<string[]> {
  const j = await getJSON<{ baseUrl: string; chapter: { hash: string; data: string[] } }>(
    `${API}/at-home/server/${chapterId}`,
  );
  return j.chapter.data.map((f) => `${j.baseUrl}/data/${j.chapter.hash}/${f}`);
}
