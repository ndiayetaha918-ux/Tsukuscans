// Nightly Playwright scraper — builds a static catalogue of anime-sama.to FR scan chapters.
// Runs on GitHub Actions where real Chromium bypasses Cloudflare (confirmed by CI probes).
//
// Output: public/library/as-chapters.json
// Format: { updatedAt, count, titles: { [slug]: { chapters: [{chapter, url}], count } } }

import { chromium } from "playwright";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";

const BASE  = "https://anime-sama.to";
const OUT   = "public/library/as-chapters.json";

// Canonical slug list — these are the slugs used on anime-sama.to
const SLUGS = [
  "haikyuu", "naruto", "one-piece", "bleach",
  "dragon-ball", "dragon-ball-z", "dragon-ball-super",
  "berserk", "attaque-des-titans", "demon-slayer",
  "my-hero-academia", "jujutsu-kaisen", "black-clover",
  "fairy-tail", "hunter-x-hunter", "fullmetal-alchemist",
  "sword-art-online", "one-punch-man", "chainsaw-man",
  "tokyo-revengers", "spy-x-family", "blue-lock",
  "vinland-saga", "kingdom", "vagabond",
  "death-note", "ao-no-exorcist", "noragami",
  "kuroko-no-basket", "slam-dunk", "captain-tsubasa",
  "katekyo-hitman-reborn", "d-gray-man", "soul-eater",
  "the-promised-neverland", "dr-stone", "fire-force",
  "nanatsu-no-taizai", "akame-ga-kill",
  "tokyo-ghoul", "parasyte", "gantz",
  "claymore", "monster", "pluto",
  "20th-century-boys", "i-am-a-hero",
  "shaman-king", "toriko", "rave-master",
  "code-geass", "evangelion",
  "fruits-basket", "clannad",
  "fullmetal-alchemist-brotherhood",
  "overlord", "re-zero", "sword-art-online-progressive",
  "mushoku-tensei", "tensura", "konosuba",
  "danmachi", "mahouka", "index",
  "oregairu", "classroom-of-the-elite",
  "rising-of-the-shield-hero",
  "aot-before-the-fall",
];

async function extractPanneauScan(page, slug) {
  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script"));
    for (const s of scripts) {
      const m = s.textContent?.match(/panneauScan\s*=\s*(\{[\s\S]*?\})\s*;/);
      if (m) return m[1];
    }
    return null;
  });
}

async function scrapeSlug(page, slug) {
  const url = `${BASE}/catalogue/${slug}/scan/vf/`;
  try {
    const res = await page.goto(url, { timeout: 28000, waitUntil: "networkidle" });
    const status = res?.status() ?? 0;

    if (status === 404) {
      // Try alternate /scan/fr/ path
      const res2 = await page.goto(`${BASE}/catalogue/${slug}/scan/fr/`, { timeout: 20000, waitUntil: "networkidle" });
      if (!res2?.ok()) {
        console.log(`  ❌ ${slug}: 404 (vf + fr tried)`);
        return null;
      }
    } else if (!res?.ok()) {
      console.log(`  ❌ ${slug}: HTTP ${status}`);
      return null;
    }

    const title = await page.title();
    if (/just a moment|cloudflare|challenge/i.test(title)) {
      console.log(`  ❌ ${slug}: Cloudflare block`);
      return null;
    }

    // Primary: panneauScan JS variable
    const panneau = await extractPanneauScan(page, slug);
    if (panneau) {
      try {
        const raw = panneau.replace(/'/g, '"');
        const obj = JSON.parse(raw);
        const chapters = Object.entries(obj).map(([num, path]) => ({
          chapter: String(num),
          url: String(path).startsWith("http") ? String(path) : new URL(String(path), BASE).href,
        }));
        chapters.sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));
        console.log(`  ✅ ${slug}: ${chapters.length} chapitres`);
        return { chapters, count: chapters.length };
      } catch (e) {
        console.log(`  ⚠️  ${slug}: panneauScan parse error — ${e.message}`);
      }
    }

    // Fallback: anchor links matching chapter/episode patterns
    const links = await page.$$eval("a[href]", (els) =>
      els
        .map((a) => ({ href: a.href, text: (a.textContent || "").trim() }))
        .filter((l) => /\/(ep|chapitre|chapter|scan)\d/i.test(l.href))
    );
    if (links.length) {
      const seen = new Set();
      const chapters = [];
      for (const l of links) {
        if (!seen.has(l.href)) {
          seen.add(l.href);
          const num = l.href.match(/\d+\/?$/)?.[0]?.replace(/\/$/, "") ?? String(chapters.length + 1);
          chapters.push({ chapter: num, url: l.href });
        }
      }
      console.log(`  ✅ ${slug}: ${chapters.length} chapitres (liens fallback)`);
      return { chapters, count: chapters.length };
    }

    console.log(`  ⚠️  ${slug}: aucun chapitre trouvé (titre: "${title.slice(0, 60)}")`);
    return null;
  } catch (e) {
    console.log(`  ❌ ${slug}: ${e.message.slice(0, 120)}`);
    return null;
  }
}

// Load existing cache so we can preserve entries for slugs that fail this run
function loadCache() {
  if (existsSync(OUT)) {
    try {
      return JSON.parse(readFileSync(OUT, "utf8"));
    } catch { /* ignore */ }
  }
  return { titles: {} };
}

// ─── main ────────────────────────────────────────────────────────────────────

console.log("╔══════════════════════════════════════╗");
console.log("║  Tsuku – scraper anime-sama chapters  ║");
console.log("╚══════════════════════════════════════╝\n");
console.log(`${SLUGS.length} slugs à scraper depuis ${BASE}\n`);

const cache = loadCache();

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
  ],
});

const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  locale: "fr-FR",
  extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
});

const page = await ctx.newPage();
// Suppress resource-intensive assets to speed up scraping
await page.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,mp4,mp3}", (r) => r.abort());

const results = {};
let success = 0;
let kept    = 0;
let errors  = 0;

for (let i = 0; i < SLUGS.length; i++) {
  const slug = SLUGS[i];
  process.stdout.write(`[${String(i + 1).padStart(2)}/${SLUGS.length}] ${slug} … `);

  const data = await scrapeSlug(page, slug);
  if (data) {
    results[slug] = data;
    success++;
  } else {
    // Preserve cached data for this slug if available
    if (cache.titles?.[slug]) {
      results[slug] = { ...cache.titles[slug], cached: true };
      kept++;
    } else {
      errors++;
    }
  }

  // Polite delay between requests
  await new Promise((r) => setTimeout(r, 800));
}

await browser.close();

// Write output
mkdirSync("public/library", { recursive: true });
const output = {
  updatedAt: new Date().toISOString(),
  count: success + kept,
  titles: results,
};
writeFileSync(OUT, JSON.stringify(output, null, 2));

console.log("\n╔══════════════════╗");
console.log(`║  Résumé scraper  ║`);
console.log("╚══════════════════╝");
console.log(`  ✅ Nouveaux/mis à jour : ${success}`);
console.log(`  📦 Conservés du cache  : ${kept}`);
console.log(`  ❌ Erreurs             : ${errors}`);
console.log(`\n  📄 ${OUT} — ${output.count} titres`);
