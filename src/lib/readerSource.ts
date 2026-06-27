import type { Chapter } from "./types";
import * as comick from "./comick";
import * as mangadex from "./mangadex";
import * as animesama from "./animesama";
import { NoGatewayError, hasGateway } from "./net";
import { findStaticChapters, staticPages } from "./library";

/* Unified reading layer.

   Priority order (all FR):
   1. Live MangaDex via gateway — full catalogue, colour editions merged
   2. Live Comick via gateway — fills gaps that MangaDex doesn't have
   3. Anime-Sama via static catalogue (built nightly by scrape-animesama.mjs)
      — used when MangaDex/Comick have <50% of the expected chapter count
   4. Static library fallback (offline / gateway down)

   Gap detection: if AniList says a title has N chapters but we found < N/2,
   we try anime-sama as a secondary source and merge both lists. */

const GAP_THRESHOLD = 0.5; // try AS if we found < 50% of expected chapters

export async function findChapters(
  opts: { anilistId?: string; titles?: string[]; expectedChapters?: number }
): Promise<Chapter[]> {
  const variants = [...new Set((opts.titles || []).filter(Boolean))].slice(0, 3);
  let liveChapters: Chapter[] = [];

  if (hasGateway()) {
    // 1. Live MangaDex
    for (const t of variants) {
      try {
        const ch = await mangadex.findChaptersByTitle(t);
        if (ch.length > liveChapters.length) liveChapters = ch;
        if (ch.length) break;
      } catch (e) {
        if (e instanceof NoGatewayError) break;
      }
    }

    // 2. Live Comick (if MangaDex found nothing)
    if (!liveChapters.length) {
      for (const t of variants) {
        try {
          const ch = await comick.findChaptersByTitle(t);
          if (ch.length) { liveChapters = ch; break; }
        } catch (e) {
          if (e instanceof NoGatewayError) break;
        }
      }
    }

    // 3. Anime-Sama gap fill: if we have far fewer chapters than expected
    const expected = opts.expectedChapters ?? 0;
    const needsGapFill =
      expected > 0
        ? liveChapters.length < expected * GAP_THRESHOLD
        : liveChapters.length < 20; // heuristic: < 20 chapters is suspicious

    if (needsGapFill) {
      try {
        const asCh = await animesama.findChaptersByTitle(variants);
        if (asCh.length > liveChapters.length) {
          // Merge: keep MangaDex chapters where we have them, fill rest from AS
          liveChapters = mergeChapterLists(liveChapters, asCh);
        }
      } catch { /* AS not available or BD not configured */ }
    }
  }

  if (liveChapters.length) return liveChapters;

  // 4. Static library fallback
  try {
    const fromLib = await findStaticChapters(opts);
    if (fromLib.length) return fromLib;
  } catch { /* nothing */ }

  return [];
}

/** Merge two chapter lists by chapter number. Primary (MangaDex) wins on conflict;
 *  secondary (AS) fills in chapter numbers that primary doesn't have. */
function mergeChapterLists(primary: Chapter[], secondary: Chapter[]): Chapter[] {
  const byNum = new Map<string, Chapter>();
  for (const c of primary) byNum.set(c.chapter, c);
  for (const c of secondary) {
    if (!byNum.has(c.chapter)) byNum.set(c.chapter, c);
  }
  return [...byNum.values()].sort((a, b) => chNum(a.chapter) - chNum(b.chapter));
}

function chNum(s: string): number {
  return parseFloat(s) || 0;
}

export function getPages(chapter: Chapter): Promise<string[]> {
  if (chapter.source === "static") return Promise.resolve(staticPages(chapter));
  if (chapter.source === "animesama") return animesama.getChapterPages(chapter.id);
  return chapter.source === "comick"
    ? comick.getChapterPages(chapter.id)
    : mangadex.getChapterPages(chapter.id);
}
