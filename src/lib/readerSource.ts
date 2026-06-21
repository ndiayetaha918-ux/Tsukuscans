import type { Chapter } from "./types";
import * as comick from "./comick";
import * as mangadex from "./mangadex";
import { NoGatewayError, hasGateway } from "./net";
import { findStaticChapters, staticPages } from "./library";

/* Unified reading layer.

   1. LIVE via the (built-in) gateway first — the FULL chapter list for any title
      across the whole FR catalogue (MangaDex, then Comick).
   2. Static library as a fallback (offline / gateway down): chapter metadata
      pre-fetched into /library, images hotlinked from uploads.mangadex.org.

   This ordering matters: the static cache is capped to a few chapters per title,
   so we must prefer the live source to get every chapter. */

export async function findChapters(opts: { anilistId?: string; titles?: string[] }): Promise<Chapter[]> {
  const variants = [...new Set((opts.titles || []).filter(Boolean))].slice(0, 3);

  if (hasGateway()) {
    // 1. Live MangaDex (full chapter list) across title variants.
    for (const t of variants) {
      try {
        const ch = await mangadex.findChaptersByTitle(t);
        if (ch.length) return ch;
      } catch (e) {
        if (e instanceof NoGatewayError) break;
      }
    }
    // 2. Live Comick.
    for (const t of variants) {
      try {
        const ch = await comick.findChaptersByTitle(t);
        if (ch.length) return ch;
      } catch (e) {
        if (e instanceof NoGatewayError) break;
      }
    }
  }

  // 3. Static library fallback (offline, or if live found nothing).
  try {
    const fromLib = await findStaticChapters(opts);
    if (fromLib.length) return fromLib;
  } catch { /* nothing */ }

  return [];
}

export function getPages(chapter: Chapter): Promise<string[]> {
  if (chapter.source === "static") return Promise.resolve(staticPages(chapter));
  return chapter.source === "comick"
    ? comick.getChapterPages(chapter.id)
    : mangadex.getChapterPages(chapter.id);
}
