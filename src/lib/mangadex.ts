import type { Manga, Chapter } from "./types";

/* ============================================================
   MangaDex data layer.
   A real, public, CORS-open API from the Tachiyomi/Keiyoushi
   ecosystem. Gives real titles, covers, search, popularity and
   chapter pages — fetched directly from the user's browser.
   ============================================================ */

const API = "https://api.mangadex.org";
const UPLOADS = "https://uploads.mangadex.org";

// Curated, stable MangaDex tag UUIDs (genre group) used for rails + filters.
export const GENRES: { name: string; id: string }[] = [
  { name: "Action", id: "391b0423-d847-456f-aff0-8b0cfc03066b" },
  { name: "Aventure", id: "87cc87cd-a395-47af-b27a-93f5b0eed4c4" },
  { name: "Comédie", id: "4d32cc48-9f00-4cca-9b5a-a839f0764984" },
  { name: "Drame", id: "b9af3a63-f058-46de-a9a0-e0c13906197a" },
  { name: "Fantasy", id: "cdc58593-87dd-415e-bbc0-2ec27bf404cc" },
  { name: "Horreur", id: "cdad7e68-1419-41dd-bdce-27753074a640" },
  { name: "Psychologique", id: "3b60b75c-a2d7-4860-ab56-05f391bb889c" },
  { name: "Romance", id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d" },
  { name: "Sci-Fi", id: "256c8bd9-4904-4360-bf4f-508a76d67183" },
  { name: "Tranche de vie", id: "e5301a23-ebd9-49dd-a0cb-2add944c7fe9" },
  { name: "Sport", id: "69964a64-2f90-4d33-beeb-f3ed2875eb4c" },
  { name: "Mystère", id: "ee968100-4191-4968-93d3-f82d72be7e46" },
  { name: "Thriller", id: "07251805-a27e-4d59-b488-f0bfbec15168" },
  { name: "Surnaturel", id: "98a8d138-9f96-4d6a-9bd1-7e2b8b1f7a0e" },
];
const GENRE_NAME_BY_ID = new Map(GENRES.map((g) => [g.id, g.name]));

const STATUS_FR: Record<string, string> = {
  ongoing: "En cours",
  completed: "Terminé",
  hiatus: "En pause",
  cancelled: "Abandonné",
};
const DEMO_FR: Record<string, string> = {
  shounen: "Shonen",
  seinen: "Seinen",
  shoujo: "Shojo",
  josei: "Josei",
};

const CONTENT = "contentRating[]=safe&contentRating[]=suggestive";

// — simple in-memory + sessionStorage cache with TTL —
const mem = new Map<string, { t: number; v: unknown }>();
const TTL = 1000 * 60 * 10;

async function getJSON<T>(url: string): Promise<T> {
  const cached = mem.get(url);
  if (cached && Date.now() - cached.t < TTL) return cached.v as T;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`MangaDex ${res.status}`);
  const json = (await res.json()) as T;
  mem.set(url, { t: Date.now(), v: json });
  return json;
}

interface MDManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    description: Record<string, string>;
    status: string;
    year: number | null;
    contentRating: string;
    publicationDemographic: string | null;
    tags: { id: string; attributes: { name: Record<string, string>; group: string } }[];
  };
  relationships: { id: string; type: string; attributes?: Record<string, unknown> }[];
}

function pickLang(map?: Record<string, string>): string {
  if (!map) return "";
  return map.fr || map.en || map["ja-ro"] || map.ja || Object.values(map)[0] || "";
}

function mapManga(m: MDManga): Manga {
  const a = m.attributes;
  const cover = m.relationships.find((r) => r.type === "cover_art");
  const fileName = cover?.attributes?.fileName as string | undefined;
  const author = m.relationships.find((r) => r.type === "author");
  const genres: string[] = [];
  const tags: string[] = [];
  for (const t of a.tags || []) {
    const name = GENRE_NAME_BY_ID.get(t.id) || pickLang(t.attributes.name);
    if (t.attributes.group === "genre") genres.push(name);
    else if (t.attributes.group === "theme") tags.push(name);
  }
  return {
    id: m.id,
    title: pickLang(a.title) || pickLang(a.altTitles?.[0]) || "Sans titre",
    author: (author?.attributes?.name as string) || "Auteur inconnu",
    year: a.year ?? undefined,
    status: STATUS_FR[a.status] || a.status,
    demographic: a.publicationDemographic ? DEMO_FR[a.publicationDemographic] : undefined,
    genres: genres.slice(0, 4),
    tags: tags.slice(0, 6),
    synopsis: pickLang(a.description).replace(/\[.*?\]\(.*?\)/g, "").trim(),
    coverUrl: fileName ? `${UPLOADS}/covers/${m.id}/${fileName}.512.jpg` : undefined,
    coverThumb: fileName ? `${UPLOADS}/covers/${m.id}/${fileName}.256.jpg` : undefined,
    contentRating: a.contentRating,
  };
}

const INCLUDES = "includes[]=cover_art&includes[]=author";

interface MDList<T> { data: T[]; total: number }

export async function listPopular(limit = 24, offset = 0): Promise<Manga[]> {
  const url = `${API}/manga?limit=${limit}&offset=${offset}&${CONTENT}&${INCLUDES}&order[followedCount]=desc&hasAvailableChapters=true&availableTranslatedLanguage[]=fr&availableTranslatedLanguage[]=en`;
  const j = await getJSON<MDList<MDManga>>(url);
  return j.data.map(mapManga);
}

export async function listRecent(limit = 18): Promise<Manga[]> {
  const url = `${API}/manga?limit=${limit}&${CONTENT}&${INCLUDES}&order[latestUploadedChapter]=desc&hasAvailableChapters=true&availableTranslatedLanguage[]=en`;
  const j = await getJSON<MDList<MDManga>>(url);
  return j.data.map(mapManga);
}

export async function listByGenre(tagId: string, limit = 18): Promise<Manga[]> {
  const url = `${API}/manga?limit=${limit}&${CONTENT}&${INCLUDES}&includedTags[]=${tagId}&order[followedCount]=desc&hasAvailableChapters=true&availableTranslatedLanguage[]=en`;
  const j = await getJSON<MDList<MDManga>>(url);
  return j.data.map(mapManga);
}

export async function searchManga(query: string, limit = 30): Promise<Manga[]> {
  const q = query.trim();
  if (!q) return listPopular(limit);
  const url = `${API}/manga?title=${encodeURIComponent(q)}&limit=${limit}&${CONTENT}&${INCLUDES}&order[relevance]=desc`;
  const j = await getJSON<MDList<MDManga>>(url);
  return j.data.map(mapManga);
}

export async function getManga(id: string): Promise<Manga> {
  const url = `${API}/manga/${id}?${INCLUDES}`;
  const j = await getJSON<{ data: MDManga }>(url);
  return mapManga(j.data);
}

/** Batch ratings + follows. Returns { id: {rating, follows} }. */
export async function getStatistics(ids: string[]): Promise<Record<string, { rating?: number; follows?: number }>> {
  if (!ids.length) return {};
  const params = ids.slice(0, 100).map((i) => `manga[]=${i}`).join("&");
  try {
    const j = await getJSON<{ statistics: Record<string, { rating?: { average?: number; bayesian?: number }; follows?: number }> }>(
      `${API}/statistics/manga?${params}`,
    );
    const out: Record<string, { rating?: number; follows?: number }> = {};
    for (const [id, s] of Object.entries(j.statistics || {})) {
      out[id] = { rating: s.rating?.bayesian ?? s.rating?.average, follows: s.follows };
    }
    return out;
  } catch {
    return {};
  }
}

interface MDChapter {
  id: string;
  attributes: { chapter: string | null; title: string | null; pages: number; publishAt: string; translatedLanguage: string };
  relationships: { id: string; type: string; attributes?: Record<string, unknown> }[];
}

export async function getChapters(mangaId: string, lang = "en"): Promise<Chapter[]> {
  const url = `${API}/manga/${mangaId}/feed?translatedLanguage[]=${lang}&${CONTENT}&order[volume]=asc&order[chapter]=asc&limit=200&includes[]=scanlation_group`;
  const j = await getJSON<MDList<MDChapter>>(url);
  const seen = new Set<string>();
  const out: Chapter[] = [];
  for (const c of j.data) {
    const num = c.attributes.chapter ?? "";
    if (num && seen.has(num)) continue; // dedupe multiple groups
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

/** Returns full page image URLs for a chapter via the at-home server. */
export async function getChapterPages(chapterId: string): Promise<string[]> {
  const j = await getJSON<{ baseUrl: string; chapter: { hash: string; data: string[] } }>(
    `${API}/at-home/server/${chapterId}`,
  );
  return j.chapter.data.map((f) => `${j.baseUrl}/data/${j.chapter.hash}/${f}`);
}

/** Deterministic accent hue per id, for gradient placeholders behind covers. */
export function hueFor(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
