import type { Chapter } from "./types";
import { mdUrl, imgUrl, getJSON } from "./net";

/* MangaDex reading source. Routes through the gateway (the only reliable path —
   MangaDex's API sends no CORS header, so a browser can't call it directly). */

const CONTENT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

const mdGet = <T>(path: string) => getJSON<T>(mdUrl(path));

interface MDList<T> { data: T[]; total?: number }
interface MDChapter {
  id: string;
  attributes: { chapter: string | null; title: string | null; pages: number; publishAt: string; translatedLanguage: string; externalUrl?: string | null };
  relationships: { type: string; attributes?: Record<string, unknown> }[];
}

async function findMangaId(title: string): Promise<string | null> {
  const j = await mdGet<MDList<{ id: string }>>(`manga?title=${encodeURIComponent(title)}&limit=1&${CONTENT}&order[relevance]=desc`);
  return j.data[0]?.id ?? null;
}

async function feed(id: string, lang: string): Promise<Chapter[]> {
  const seen = new Set<string>();
  const out: Chapter[] = [];
  // Paginate so long series get every chapter, not just the first page.
  for (let off = 0; off < 1000; off += 100) {
    const j = await mdGet<MDList<MDChapter>>(`manga/${id}/feed?translatedLanguage[]=${lang}&${CONTENT}&order[volume]=asc&order[chapter]=asc&limit=100&offset=${off}&includes[]=scanlation_group`);
    if (!j.data.length) break;
    for (const c of j.data) {
      // Skip external (e.g. MangaPlus) and empty chapters — they have no readable
      // pages on the source. Filtering BEFORE dedup means a real scan-team chapter
      // isn't shadowed by an empty external one with the same number.
      if (!c.attributes.pages || c.attributes.externalUrl) continue;
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
        source: "mangadex",
      });
    }
    if (j.data.length < 100) break;
  }
  return out;
}

/** Chapters for a title, French first then English. */
export async function findChaptersByTitle(title: string): Promise<Chapter[]> {
  const id = await findMangaId(title);
  if (!id) return [];
  const fr = await feed(id, "fr");
  if (fr.length > 0) return fr;
  return feed(id, "en");
}

/** Page image URLs (proxied through the gateway when configured). */
export async function getChapterPages(chapterId: string): Promise<string[]> {
  const j = await mdGet<{ baseUrl: string; chapter: { hash: string; data: string[] } }>(`at-home/server/${chapterId}`);
  return j.chapter.data.map((f) => imgUrl(`${j.baseUrl}/data/${j.chapter.hash}/${f}`));
}
