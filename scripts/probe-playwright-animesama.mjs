// Test: can a real Playwright/Chromium browser access anime-sama.to from
// a GitHub Actions runner (datacenter IP)?
// Real browser != simple fetch — Cloudflare often lets browsers through.

import { chromium } from "playwright";

const SLUGS = ["haikyuu", "naruto", "one-piece", "bleach", "dragon-ball"];
const BASE  = "https://anime-sama.to";

console.log("Launching Chromium…");
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  locale: "fr-FR",
  extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9" },
});

// ── 1. Test the home page first ──────────────────────────────────────────────
console.log("\n═══ 1. Page d'accueil anime-sama.to ═══");
const page = await ctx.newPage();
try {
  const res = await page.goto(`${BASE}/`, { timeout: 20000, waitUntil: "domcontentloaded" });
  const title = await page.title();
  const blocked = /just a moment|cloudflare|challenge/i.test(title);
  console.log(`  ${res?.ok() && !blocked ? "✅" : "❌"} Status ${res?.status()} — titre: "${title}"`);
} catch (e) {
  console.log(`  ❌ ${e.message}`);
}

// ── 2. Test a catalogue page ──────────────────────────────────────────────────
console.log("\n═══ 2. Page catalogue (haikyuu) ═══");
const slug = SLUGS[0];
const catUrl = `${BASE}/catalogue/${slug}/`;
try {
  const res = await page.goto(catUrl, { timeout: 20000, waitUntil: "networkidle" });
  const title = await page.title();
  const html  = await page.content();
  const blocked = /just a moment|cloudflare|challenge/i.test(title + html);
  const hasScan = /scan|chapitre|chapter|vf|lecture/i.test(html);
  console.log(`  ${res?.ok() && !blocked ? "✅" : "❌"} ${catUrl}`);
  console.log(`  Status: ${res?.status()} — titre: "${title}"`);
  console.log(`  Contenu scan: ${hasScan ? "✅ OUI" : "❌ NON"}`);

  // Look for scan/fr or scan/vf link
  const links = await page.$$eval("a[href]", (els) =>
    els.map((a) => a.href).filter((h) => /scan|chapitre|lecture/i.test(h))
  );
  if (links.length) console.log(`  Liens scan trouvés: ${links.slice(0, 3).join(", ")}`);

  // Look for panneauScan JS variable
  const panneau = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script"));
    for (const s of scripts) {
      const m = s.textContent?.match(/panneauScan\s*=\s*(\{[\s\S]*?\})/);
      if (m) return m[1];
    }
    return null;
  });
  if (panneau) {
    try {
      const obj = JSON.parse(panneau.replace(/'/g, '"'));
      const keys = Object.keys(obj);
      console.log(`  ✨ panneauScan: ${keys.length} chapitres (${keys[0]}→${keys[keys.length-1]})`);
      console.log(`     Exemple URL: ${Object.values(obj)[0]}`);
    } catch (e) {
      console.log(`  panneauScan trouvé mais non parsé: ${panneau.slice(0, 100)}`);
    }
  } else {
    console.log("  panneauScan: non trouvé");
  }
} catch (e) {
  console.log(`  ❌ ${e.message}`);
}

// ── 3. Quick test of all slugs ────────────────────────────────────────────────
console.log("\n═══ 3. Accessibilité des autres titres ═══");
for (const s of SLUGS.slice(1)) {
  try {
    const r = await page.goto(`${BASE}/catalogue/${s}/`, { timeout: 15000, waitUntil: "domcontentloaded" });
    const t = await page.title();
    const ok = r?.ok() && !/cloudflare|just a moment/i.test(t);
    console.log(`  ${ok ? "✅" : "❌"} /catalogue/${s}/ — ${r?.status()} "${t.slice(0,50)}"`);
  } catch (e) {
    console.log(`  ❌ ${s}: ${e.message}`);
  }
}

await browser.close();
console.log("\n═══ Résumé ═══");
console.log("  Si ✅ ci-dessus → Playwright fonctionne, on peut scraper toute la nuit via GitHub Actions.");
console.log("  Si ❌ → Cloudflare bloque même les vrais navigateurs.");
