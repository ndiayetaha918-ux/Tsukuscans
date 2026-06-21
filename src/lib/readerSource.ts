import type { Chapter } from "./types";
import * as comick from "./comick";
import * as mangadex from "./mangadex";
import { NoGatewayError } from "./net";
import { findStaticChapters, staticPages } from "./library";

/* Unified reading layer.

   1. STATIC LIBRARY first — zero setup, works for everyone: chapter metadata is
      pre-fetched into /library on this site and images are hotlinked from
      uploads.mangadex.org. No relay, no deploy.
   2. If a title isn't in the library, fall back to live sources through the
      optional gateway (MangaDex, then Comick) for the full catalogue.

   A NoGatewayError from the live path is rethrown only when the static path also
   found nothing, so the reader can offer the optional gateway for off-library
   titles without nagging when reading already works. */

export async function findChapters(opts: { anilistId?: string; titles?: string[] }): Promise<Chapter[]> {
  // 1. Static library (no setup).
  try {
    const fromLib = await findStaticChapters(opts);
    if (fromLib.length) return fromLib;
  } catch { /* fall through to live sources */ }

  const variants = [...new Set((opts.titles || []).filter(Boolean))].slice(0, 3);
  if (variants.length === 0) return [];

  // 2. Live MangaDex via gateway across title variants.
  for (const t of variants) {
    try {
      const ch = await mangadex.findChaptersByTitle(t);
      if (ch.length) return ch;
    } catch (e) {
      if (e instanceof NoGatewayError) throw e;
    }
  }
  // 3. Live Comick via gateway.
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
  if (chapter.source === "static") return Promise.resolve(staticPages(chapter));
  return chapter.source === "comick"
    ? comick.getChapterPages(chapter.id)
    : mangadex.getChapterPages(chapter.id);
}
