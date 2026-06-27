import type { Chapter } from "./types";
import { imgUrl } from "./net";

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
  "attaque des titans": "attaque-des-titans",
  "demon slayer": "demon-slayer",
  "kimetsu no yaiba": "demon-slayer",
  "my hero academia": "my-hero-academia",
  "boku no hero academia": "my-hero-academia",
  "jujutsu kaisen": "jujutsu-kaisen",
  "black clover": "black-clover",
  "fairy tail": "fairy-tail",
  "hunter x hunter": "hunter-x-hunter",
  "fullmetal alchemist": "fullmetal-alchemist",
  "fullmetal alchemist brotherhood": "fullmetal-alchemist-brotherhood",
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
  "death note": "death-note",
  "ao no exorcist": "ao-no-exorcist",
  "blue exorcist": "ao-no-exorcist",
  "noragami": "noragami",
  "kuroko no basket": "kuroko-no-basket",
  "slam dunk": "slam-dunk",
  "captain tsubasa": "captain-tsubasa",
  "katekyo hitman reborn": "katekyo-hitman-reborn",
  "reborn!": "katekyo-hitman-reborn",
  "d.gray-man": "d-gray-man",
  "soul eater": "soul-eater",
  "the promised neverland": "the-promised-neverland",
  "dr. stone": "dr-stone",
  "dr stone": "dr-stone",
  "fire force": "fire-force",
  "enen no shouboutai": "fire-force",
  "nanatsu no taizai": "nanatsu-no-taizai",
  "seven deadly sins": "nanatsu-no-taizai",
  "akame ga kill": "akame-ga-kill",
  "tokyo ghoul": "tokyo-ghoul",
  "parasyte": "parasyte",
  "gantz": "gantz",
  "claymore": "claymore",
  "monster": "monster",
  "pluto": "pluto",
  "20th century boys": "20th-century-boys",
  "i am a hero": "i-am-a-hero",
  "shaman king": "shaman-king",
  "toriko": "toriko",
  "code geass": "code-geass",
  "overlord": "overlord",
  "re:zero": "re-zero",
  "re zero": "re-zero",
  "mushoku tensei": "mushoku-tensei",
  "tensura": "tensura",
  "that time i got reincarnated as a slime": "tensura",
  "konosuba": "konosuba",
  "danmachi": "danmachi",
  "classroom of the elite": "classroom-of-the-elite",
  "rising of the shield hero": "rising-of-the-shield-hero",
};

const BASE = import.meta.env.BASE_URL || "/";

export const AS_BASE = "https://anime-sama.to";

// ── Static catalogue (built by nightly scraper) ───────────────────────────

interface AsEntry {
  chapters: { chapter: string; url: string }[];
  count: number;
  cached?: boolean;
}
interface AsCatalogue {
  updatedAt: string;
  count: number;
  titles: Record<string, AsEntry>;
}

let cataloguePromise: Promise<AsCatalogue | null> | null = null;
function loadCatalogue(): Promise<AsCatalogue | null> {
  if (!cataloguePromise) {
    cataloguePromise = fetch(`${BASE}library/as-chapters.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return cataloguePromise;
}

function deriveSlug(title: string): string {
  const key = title.toLowerCase().trim();
  if (SLUG_MAP[key]) return SLUG_MAP[key];
  return key
    .replace(/[!!！]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function findChaptersByTitle(titles: string[]): Promise<Chapter[]> {
  const cat = await loadCatalogue();
  if (!cat?.titles) return [];

  for (const title of titles) {
    const slug = deriveSlug(title);
    if (!slug) continue;
    const entry = cat.titles[slug];
    if (entry?.chapters?.length) {
      return entry.chapters.map((c) => ({
        id: c.url,
        chapter: c.chapter,
        title: `Chapitre ${c.chapter}`,
        pages: 0,
        publishAt: "",
        group: "Anime-Sama",
        lang: "fr",
        source: "animesama" as const,
      }));
    }
  }
  return [];
}

// ── Page images ───────────────────────────────────────────────────────────

// Chapter page URLs are on anime-sama.to. At read time the gateway fetches
// the reader HTML and extracts listImagesPage. The gateway tries a direct
// server-side fetch first (no BD); images are then proxied through /img.
import { asPagesUrl } from "./net";

export async function getChapterPages(chapterUrl: string): Promise<string[]> {
  const url = asPagesUrl(chapterUrl);
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`AS pages: ${r.status}`);
  const data = await r.json() as { pages: string[]; error?: string };
  if (data.error) throw new Error(data.error);
  // Proxy each image through the gateway so the referer/CORS is handled
  return (data.pages ?? []).map((u) => imgUrl(u));
}
