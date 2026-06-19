import type { Manga, MangaSource, RepositoryManifest, SourceDescriptor } from "./types";
import { CATALOG } from "@/data/catalog";

/* ============================================================
   Modular source system.
   Nothing about a specific repository is hard-wired into the app:
   the UI talks to the `MangaSource` interface, and repositories are
   declared as data (URL + manifest), so they can be added, swapped,
   enabled or disabled at runtime.
   ============================================================ */

export const DEFAULT_REPOSITORIES: { id: string; name: string; url: string }[] = [
  {
    id: "keiyoushi",
    name: "Keiyoushi",
    url: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json",
  },
];

/** The built-in, always-available catalog. Fully functional offline. */
export const localSource: MangaSource = {
  id: "tsuki-local",
  name: "Tsuki — Sélection",
  kind: "local",
  enabled: true,
  async list(): Promise<Manga[]> {
    return CATALOG;
  },
};

interface KeiyoushiEntry {
  name: string;
  lang: string;
  nsfw?: number;
  sources?: { name: string; lang: string; id: string; baseUrl?: string }[];
}

/** Fetch and parse a Keiyoushi-compatible `index.min.json` into descriptors.
 *  This proves the repository layer is real and live; executing a remote
 *  source's scraping logic requires a native bridge, so list() stays empty
 *  by design until one is attached. */
export async function fetchRepository(
  repo: { id: string; name: string; url: string },
  opts: { signal?: AbortSignal; allowNsfw?: boolean } = {},
): Promise<RepositoryManifest> {
  const res = await fetch(repo.url, { signal: opts.signal });
  if (!res.ok) throw new Error(`Dépôt injoignable (${res.status})`);
  const raw = (await res.json()) as KeiyoushiEntry[];

  const sources: SourceDescriptor[] = [];
  for (const entry of raw) {
    if (!opts.allowNsfw && entry.nsfw) continue;
    for (const s of entry.sources ?? []) {
      sources.push({
        id: s.id,
        name: s.name,
        lang: s.lang,
        baseUrl: s.baseUrl,
        nsfw: Boolean(entry.nsfw),
      });
    }
  }
  return { id: repo.id, url: repo.url, name: repo.name, enabled: true, sources };
}

export function summarizeRepository(manifest: RepositoryManifest) {
  const langs = new Map<string, number>();
  for (const s of manifest.sources) langs.set(s.lang, (langs.get(s.lang) ?? 0) + 1);
  const topLangs = [...langs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return { total: manifest.sources.length, topLangs };
}
