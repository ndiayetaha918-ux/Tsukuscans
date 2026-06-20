import type { Chapter } from "./types";
import * as comick from "./comick";
import * as mangadex from "./mangadex";

/* Unified reading layer. Tries multiple sources and title variants so reading
   works as often as possible without any server: Comick first (different infra,
   colour + FR scans), MangaDex as fallback. Whichever returns chapters wins. */

export async function findChapters(titles: string[]): Promise<Chapter[]> {
  const variants = [...new Set(titles.filter(Boolean))].slice(0, 3);
  if (variants.length === 0) return [];

  // Comick across title variants.
  for (const t of variants) {
    try {
      const ch = await comick.findChaptersByTitle(t);
      if (ch.length) return ch;
    } catch { /* try next */ }
  }
  // MangaDex fallback across title variants.
  for (const t of variants) {
    try {
      const ch = await mangadex.findChaptersByTitle(t);
      if (ch.length) return ch;
    } catch { /* try next */ }
  }
  return [];
}

export function getPages(chapter: Chapter): Promise<string[]> {
  return chapter.source === "comick"
    ? comick.getChapterPages(chapter.id)
    : mangadex.getChapterPages(chapter.id);
}
