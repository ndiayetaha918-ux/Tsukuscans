import type { Chapter } from "./types";
import { ckUrl, imgUrl, getJSON } from "./net";

/* Comick reading source (colour scans + French teams). Routes through the
   gateway when configured, else best-effort. Defensive parsing. */

const IMG = "https://meo.comick.pictures";

const ckGet = <T>(path: string) => getJSON<T>(ckUrl(path));

interface CSearch { hid?: string; title?: string }
interface CChapter { hid: string; chap: string | null; title: string | null; lang: string; group_name?: string[] | null; created_at?: string }

async function findHid(title: string): Promise<string | null> {
  const list = await ckGet<CSearch[]>(`v1.0/search?q=${encodeURIComponent(title)}&limit=5`);
  return Array.isArray(list) ? list[0]?.hid ?? null : null;
}

async function chaptersFor(hid: string, lang: string): Promise<Chapter[]> {
  const data = await ckGet<{ chapters?: CChapter[] }>(`comic/${hid}/chapters?lang=${lang}&limit=200&chap-order=1`);
  const raw = data.chapters ?? [];
  const seen = new Set<string>();
  const out: Chapter[] = [];
  for (const c of raw) {
    const num = c.chap ?? "";
    if (num && seen.has(num)) continue;
    if (num) seen.add(num);
    out.push({ id: c.hid, chapter: num || "—", title: c.title || (num ? `Chapitre ${num}` : "Oneshot"), pages: 0, publishAt: c.created_at || "", group: c.group_name?.[0], lang: c.lang, source: "comick" });
  }
  return out;
}

export async function findChaptersByTitle(title: string): Promise<Chapter[]> {
  const hid = await findHid(title);
  if (!hid) return [];
  const fr = await chaptersFor(hid, "fr").catch(() => []);
  if (fr.length > 0) return fr;
  return chaptersFor(hid, "en").catch(() => []);
}

export async function getChapterPages(chapterHid: string): Promise<string[]> {
  try {
    const imgs = await ckGet<{ b2key?: string; url?: string }[]>(`chapter/${chapterHid}/get_images`);
    if (Array.isArray(imgs) && imgs.length) return imgs.map((i) => imgUrl(i.url || `${IMG}/${i.b2key}`)).filter(Boolean);
  } catch { /* fall through */ }
  const d = await ckGet<{ chapter?: { md_images?: { b2key: string }[] } }>(`chapter/${chapterHid}?tachiyomi=true`);
  return (d.chapter?.md_images ?? []).map((i) => imgUrl(`${IMG}/${i.b2key}`));
}
