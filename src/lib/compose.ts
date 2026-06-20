import type { Manga, TasteSeed } from "./types";
import type { ProgressEntry } from "@/store/useStore";

/* The composer. Turns content pools + user state into a varied SEQUENCE of
   blocks — never two of the same kind adjacent, order changes with state and
   the day, coverflow stays rare. This is what replaces the rail stack. */

export type Block =
  | { t: "hero"; manga: Manga; reason?: string }
  | { t: "continue"; items: [string, ProgressEntry][] }
  | { t: "tall"; items: Manga[] }
  | { t: "feature"; manga: Manga; reason: string }
  | { t: "mosaic"; title: string; items: Manga[] }
  | { t: "collection"; title: string; items: Manga[] }
  | { t: "discovery"; items: Manga[] }
  | { t: "spotlight"; manga: Manga; reason: string }
  | { t: "rail"; title: string; subtitle?: string; items: Manga[]; big?: boolean };

export interface Pools {
  recommended: Manga[];
  trending: Manga[];
  recent: Manga[];
  gems: Manga[];
  genres: { name: string; items: Manga[] }[];
  continue: [string, ProgressEntry][];
}

export interface ComposeCtx {
  anchor?: TasteSeed;       // strongest taste signal (for "because you liked")
  leadGenre: string;
  justFinished: boolean;
}

export function composeHome(pools: Pools, ctx: ComposeCtx): Block[] {
  const used = new Set<string>();
  const take = (list: Manga[], n: number): Manga[] => {
    const out: Manga[] = [];
    for (const m of list) {
      if (used.has(m.id)) continue;
      used.add(m.id);
      out.push(m);
      if (out.length >= n) break;
    }
    return out;
  };

  const blocks: Block[] = [];
  const heroManga = pools.recommended[0] ?? pools.trending[0];
  if (heroManga) {
    used.add(heroManga.id);
    blocks.push({ t: "hero", manga: heroManga, reason: ctx.anchor ? `Parce que vous avez aimé ${ctx.anchor.title}` : undefined });
  }
  if (pools.continue.length) blocks.push({ t: "continue", items: pools.continue.slice(0, 10) });

  // A small menu of candidate blocks, consumed in a rhythm template.
  const tall = () => { const it = take(pools.recommended, 3); return it.length >= 2 ? ({ t: "tall", items: it } as Block) : null; };
  const feature = () => { const it = take(pools.trending, 1)[0]; return it ? ({ t: "feature", manga: it, reason: ctx.anchor ? `Parce que vous avez aimé ${ctx.anchor.title}` : "Tendance forte cette semaine" } as Block) : null; };
  const mosaic = () => { const g = pools.genres[0]; const it = take(g?.items ?? pools.trending, 6); return it.length >= 5 ? ({ t: "mosaic", title: g?.name ?? "À explorer", items: it } as Block) : null; };
  const gems = () => { const it = take(pools.gems, 8); return it.length >= 4 ? ({ t: "rail", title: "Pépites", subtitle: "Sous-cotées, adorées", items: it, big: true } as Block) : null; };
  const collection = () => { const g = pools.genres[1] ?? pools.genres[0]; const it = take(g?.items ?? pools.recent, 6); return it.length >= 4 ? ({ t: "collection", title: g ? `Univers · ${g.name}` : "Collection", items: it } as Block) : null; };
  const discovery = () => { const it = take(pools.recommended.length > 3 ? pools.recommended : pools.trending, 4); return it.length ? ({ t: "discovery", items: it } as Block) : null; };
  const recent = () => { const it = take(pools.recent, 10); return it.length >= 4 ? ({ t: "rail", title: "Nouveautés", items: it } as Block) : null; };
  const spotlight = () => { const it = take(pools.gems, 1)[0]; return it ? ({ t: "spotlight", manga: it, reason: ctx.justFinished ? "Pour continuer sur ta lancée" : "Découverte du jour" } as Block) : null; };
  const genreRail = (i: number) => () => { const g = pools.genres[i]; if (!g) return null; const it = take(g.items, 10); return it.length >= 4 ? ({ t: "rail", title: g.name, items: it } as Block) : null; };

  // Three rhythm templates; pick by state + day so the scroll is never identical.
  const day = new Date().getDate();
  const templates: (() => Block | null)[][] = [
    [tall, feature, mosaic, discovery, gems, collection, genreRail(2), spotlight, recent, genreRail(3)],
    [feature, tall, collection, discovery, mosaic, gems, spotlight, genreRail(2), recent],
    [mosaic, feature, tall, gems, discovery, collection, genreRail(2), spotlight, recent, genreRail(3)],
  ];
  const order = templates[(day + (ctx.justFinished ? 1 : 0)) % templates.length];

  let lastT = "hero";
  for (const make of order) {
    const b = make();
    if (b && b.t !== lastT) {
      blocks.push(b);
      lastT = b.t;
    }
  }
  return blocks;
}
