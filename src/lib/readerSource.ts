import type { Chapter } from "./types";
import * as comick from "./comick";
import * as mangadex from "./mangadex";
import { NoGatewayError } from "./net";

/* Unified reading layer. Tries multiple sources and title variants so reading
   works as often as possible: MangaDex first (proven FR catalogue + reliable
   through the gateway), Comick as a colour-scan alternative. Whichever returns
   chapters wins. A NoGatewayError means reading isn't configured yet — it is
   rethrown immediately so the reader can show setup guidance instead of a vague
   "source injoignable". */

export async function findChapters(titles: string[]): Promise<Chapter[]> {
  const variants = [...new Set(titles.filter(Boolean))].slice(0, 3);
  if (variants.length === 0) return [];

  // MangaDex across title variants (proven FR scans, reliable via gateway).
  for (const t of variants) {
    try {
      const ch = await mangadex.findChaptersByTitle(t);
      if (ch.length) return ch;
    } catch (e) {
      if (e instanceof NoGatewayError) throw e;
    }
  }
  // Comick fallback across title variants.
  for (const t of variants) {
    try {
      const ch = await comick.findChaptersByTitle(t);
      if (ch.length) return ch;
    } catch (e) {
      if (e instanceof NoGatewayError) throw e;
    }
  }
  return [];
}

export function getPages(chapter: Chapter): Promise<string[]> {
  return chapter.source === "comick"
    ? comick.getChapterPages(chapter.id)
    : mangadex.getChapterPages(chapter.id);
}
