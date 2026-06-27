import type { Chapter } from "./types";
import { asChaptersUrl, asPagesUrl } from "./net";

// Known title → anime-sama slug overrides where auto-derivation fails
const SLUG_MAP: Record<string, string> = {
  "haikyuu": "haikyuu",
  "haikyu": "haikyuu",
  "haikyū": "haikyuu",
  "haikyu!!": "haikyuu",
  "naruto": "naruto",
  "one piece": "one-piece",
  "bleach": "bleach",
  "dragon ball": "dragon-ball",
  "dragon ball z": "dragon-ball-z",
  "dragon ball super": "dragon-ball-super",
  "berserk": "berserk",
  "attack on titan": "attaque-des-titans",
  "shingeki no kyojin": "attaque-des-titans",
  "l'attaque des titans": "attaque-des-titans",
  "demon slayer": "demon-slayer",
  "kimetsu no yaiba": "demon-slayer",
  "my hero academia": "my-hero-academia",
  "boku no hero academia": "my-hero-academia",
  "jujutsu kaisen": "jujutsu-kaisen",
  "black clover": "black-clover",
  "fairy tail": "fairy-tail",
  "hunter x hunter": "hunter-x-hunter",
  "fullmetal alchemist": "fullmetal-alchemist",
  "sword art online": "sword-art-online",
  "one-punch man": "one-punch-man",
  "one punch man": "one-punch-man",
  "chainsaw man": "chainsaw-man",
  "tokyo revengers": "tokyo-revengers",
  "spy x family": "spy-x-family",
  "blue lock": "blue-lock",
  "vinland saga": "vinland-saga",
  "kingdom": "kingdom",
  "vagabond": "vagabond",
};

function deriveSlug(title: string): string {
  const key = title.toLowerCase().trim();
  if (SLUG_MAP[key]) return SLUG_MAP[key];
  // Remove common suffixes and normalize
  return key
    .replace(/[!!！]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface AsChapter {
  chapter: string;
  url: string;
}

interface AsResponse {
  slug: string;
  chapters: AsChapter[];
  source: string;
  error?: string;
}

export async function findChaptersByTitle(titles: string[]): Promise<Chapter[]> {
  for (const title of titles) {
    const slug = deriveSlug(title);
    if (!slug) continue;
    try {
      const url = asChaptersUrl(slug);
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) {
        if (r.status === 503) return []; // BD_TOKEN not configured — skip silently
        continue;
      }
      const data: AsResponse = await r.json();
      if (data.error || !data.chapters?.length) continue;
      return data.chapters.map((c) => ({
        id: c.url,
        chapter: c.chapter,
        title: `Chapitre ${c.chapter}`,
        pages: 0,
        publishAt: "",
        group: "Anime-Sama",
        lang: "fr",
        source: "animesama" as const,
      }));
    } catch {
      continue;
    }
  }
  return [];
}

export async function getChapterPages(chapterUrl: string): Promise<string[]> {
  const url = asPagesUrl(chapterUrl);
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`AS pages: ${r.status}`);
  const data = await r.json() as { pages: string[]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.pages ?? [];
}
