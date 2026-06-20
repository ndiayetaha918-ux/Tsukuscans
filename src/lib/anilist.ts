import type { Manga } from "./types";

/* ============================================================
   AniList data layer (browse / discovery / search).
   GraphQL, CORS-open, very reliable from the browser. Provides
   real titles, cover art, wide banner images (16:9 heroes),
   genres, popularity, scores and synopses.
   Chapter pages come from MangaDex (see mangadex.ts), best-effort.
   ============================================================ */

const ENDPOINT = "https://graphql.anilist.co";

export const GENRES: { name: string; value: string }[] = [
  { name: "Action", value: "Action" },
  { name: "Aventure", value: "Adventure" },
  { name: "Comédie", value: "Comedy" },
  { name: "Drame", value: "Drama" },
  { name: "Fantasy", value: "Fantasy" },
  { name: "Horreur", value: "Horror" },
  { name: "Mystère", value: "Mystery" },
  { name: "Psychologique", value: "Psychological" },
  { name: "Romance", value: "Romance" },
  { name: "Sci-Fi", value: "Sci-Fi" },
  { name: "Tranche de vie", value: "Slice of Life" },
  { name: "Sport", value: "Sports" },
  { name: "Surnaturel", value: "Supernatural" },
  { name: "Thriller", value: "Thriller" },
];
const GENRE_FR = new Map(GENRES.map((g) => [g.value, g.name]));

const STATUS_FR: Record<string, string> = {
  FINISHED: "Terminé",
  RELEASING: "En cours",
  HIATUS: "En pause",
  NOT_YET_RELEASED: "À venir",
  CANCELLED: "Abandonné",
};

const MEDIA_FIELDS = `
  id
  title { english romaji native }
  coverImage { extraLarge large color }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  popularity
  status
  startDate { year }
  trailer { id site }
  staff(perPage: 1, sort: [RELEVANCE]) { nodes { name { full } } }
`;

const mem = new Map<string, { t: number; v: unknown }>();
const TTL = 1000 * 60 * 10;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql<T>(query: string, variables: Record<string, unknown>, cacheKey: string): Promise<T> {
  const cached = mem.get(cacheKey);
  if (cached && Date.now() - cached.t < TTL) return cached.v as T;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: ctrl.signal,
      });
      if (res.status === 429) { await delay(1200); continue; } // rate limit
      if (!res.ok) throw new Error(`AniList ${res.status}`);
      const json = (await res.json()) as { data: T };
      mem.set(cacheKey, { t: Date.now(), v: json.data });
      return json.data;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await delay(500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("AniList indisponible");
}

interface AniMedia {
  id: number;
  title: { english: string | null; romaji: string | null; native: string | null };
  coverImage: { extraLarge: string | null; large: string | null; color: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  popularity: number | null;
  status: string | null;
  startDate: { year: number | null } | null;
  trailer: { id: string | null; site: string | null } | null;
  staff: { nodes: { name: { full: string | null } }[] } | null;
}

function stripHtml(s: string | null): string {
  if (!s) return "";
  return s.replace(/<br\s*\/?>(\n)?/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function mapMedia(m: AniMedia): Manga {
  return {
    id: String(m.id),
    title: m.title.english || m.title.romaji || m.title.native || "Sans titre",
    author: m.staff?.nodes?.[0]?.name?.full || "—",
    year: m.startDate?.year ?? undefined,
    status: (m.status && STATUS_FR[m.status]) || "—",
    genres: (m.genres || []).map((g) => GENRE_FR.get(g) || g).slice(0, 4),
    tags: [],
    synopsis: stripHtml(m.description),
    rating: m.averageScore != null ? m.averageScore / 10 : undefined,
    follows: m.popularity ?? undefined,
    coverUrl: m.coverImage.extraLarge || m.coverImage.large || undefined,
    coverThumb: m.coverImage.large || m.coverImage.extraLarge || undefined,
    banner: m.bannerImage || undefined,
    color: m.coverImage.color || undefined,
    trailer: m.trailer?.id && m.trailer.site ? { id: m.trailer.id, site: m.trailer.site } : undefined,
    searchTitles: [m.title.english, m.title.romaji, m.title.native].filter((t): t is string => !!t),
  };
}

async function fetchPage(sort: string, extra: Record<string, unknown>, perPage: number, pageNum: number, key: string): Promise<Manga[]> {
  const query = `query($page:Int,$perPage:Int,$sort:[MediaSort]${extra.genre !== undefined ? ",$genre:String" : ""}${extra.search !== undefined ? ",$search:String" : ""}) {
    Page(page:$page, perPage:$perPage) {
      media(type: MANGA, sort: $sort, isAdult: false${extra.genre !== undefined ? ", genre:$genre" : ""}${extra.search !== undefined ? ", search:$search" : ""}) { ${MEDIA_FIELDS} }
    }
  }`;
  const data = await gql<{ Page: { media: AniMedia[] } }>(query, { page: pageNum, perPage, sort: [sort], ...extra }, key);
  return data.Page.media.map(mapMedia);
}

export function listPopular(limit = 24, pageNum = 1): Promise<Manga[]> {
  return fetchPage("POPULARITY_DESC", {}, limit, pageNum, `ani-popular-${limit}-${pageNum}`);
}
export function listTrending(limit = 20, pageNum = 1): Promise<Manga[]> {
  return fetchPage("TRENDING_DESC", {}, limit, pageNum, `ani-trending-${limit}-${pageNum}`);
}
export function listRecent(limit = 18, pageNum = 1): Promise<Manga[]> {
  return fetchPage("START_DATE_DESC", {}, limit, pageNum, `ani-recent-${limit}-${pageNum}`);
}
export function listByGenre(genre: string, limit = 18, pageNum = 1): Promise<Manga[]> {
  return fetchPage("POPULARITY_DESC", { genre }, limit, pageNum, `ani-genre-${genre}-${limit}-${pageNum}`);
}
export function listTopRated(limit = 18, pageNum = 1): Promise<Manga[]> {
  return fetchPage("SCORE_DESC", {}, limit, pageNum, `ani-top-${limit}-${pageNum}`);
}
/** Search ALWAYS returns AniList relevance order (best/exact match first). */
export function searchManga(q: string, limit = 30): Promise<Manga[]> {
  const query = q.trim();
  if (!query) return listPopular(limit);
  return fetchPage("SEARCH_MATCH", { search: query }, limit, 1, `ani-search-${query}-${limit}`);
}

export async function getManga(id: string): Promise<Manga> {
  const query = `query($id:Int){ Media(id:$id, type:MANGA){ ${MEDIA_FIELDS} } }`;
  const data = await gql<{ Media: AniMedia }>(query, { id: Number(id) }, `ani-media-${id}`);
  return mapMedia(data.Media);
}

/** Deterministic accent hue per id (fallback gradient when no cover colour). */
export function hueFor(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
