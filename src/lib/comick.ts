import type { Chapter } from "./types";

/* Comick reading source — an aggregator with lots of colour scans and French
   teams (e.g. Little Garden). Different infrastructure from MangaDex, so it
   often works where MangaDex is blocked. Best-effort, defensive parsing. */

const API = "https://api.comick.fun";
const IMG = "https://meo.comick.pictures";

const PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

async function once<T>(url: string, timeout = 6000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Comick ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

async function getJSON<T>(url: string): Promise<T> {
  let lastErr: unknown;
  try { return await once<T>(url); } catch (e) { lastErr = e; }
  for (const proxy of PROXIES) {
    try { return await once<T>(proxy(url)); } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Comick indisponible");
}

interface CSearch { hid?: string; slug?: string; title?: string }
interface CChapter {
  hid: string;
  chap: string | null;
  title: string | null;
  lang: string;
  group_name?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

async function findHid(title: string): Promise<string | null> {
  const list = await getJSON<CSearch[]>(`${API}/v1.0/search?q=${encodeURIComponent(title)}&limit=5`);
  return Array.isArray(list) ? list[0]?.hid ?? null : null;
}

async function chaptersFor(hid: string, lang: string): Promise<Chapter[]> {
  const data = await getJSON<{ chapters?: CChapter[] }>(`${API}/comic/${hid}/chapters?lang=${lang}&limit=200&chap-order=1`);
  const raw = data.chapters ?? [];
  const seen = new Set<string>();
  const out: Chapter[] = [];
  for (const c of raw) {
    const num = c.chap ?? "";
    if (num && seen.has(num)) continue;
    if (num) seen.add(num);
    out.push({
      id: c.hid,
      chapter: num || "—",
      title: c.title || (num ? `Chapitre ${num}` : "Oneshot"),
      pages: 0,
      publishAt: c.created_at || c.updated_at || "",
      group: c.group_name?.[0],
      lang: c.lang,
      source: "comick",
    });
  }
  return out;
}

/** Chapters for a title, French first then English. Empty if not found. */
export async function findChaptersByTitle(title: string): Promise<Chapter[]> {
  const hid = await findHid(title);
  if (!hid) return [];
  const fr = await chaptersFor(hid, "fr").catch(() => []);
  if (fr.length > 0) return fr;
  return chaptersFor(hid, "en").catch(() => []);
}

/** Page image URLs for a Comick chapter. */
export async function getChapterPages(chapterHid: string): Promise<string[]> {
  // Primary: get_images endpoint.
  try {
    const imgs = await getJSON<{ b2key?: string; url?: string }[]>(`${API}/chapter/${chapterHid}/get_images`);
    if (Array.isArray(imgs) && imgs.length) {
      return imgs.map((i) => (i.url ? i.url : `${IMG}/${i.b2key}`)).filter(Boolean);
    }
  } catch { /* fall through */ }
  // Fallback: chapter detail with md_images.
  const d = await getJSON<{ chapter?: { md_images?: { b2key: string }[] } }>(`${API}/chapter/${chapterHid}?tachiyomi=true`);
  return (d.chapter?.md_images ?? []).map((i) => `${IMG}/${i.b2key}`);
}
