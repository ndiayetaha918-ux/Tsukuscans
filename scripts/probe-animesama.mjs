// Ground-truth probe for Anime-Sama (anime-sama.fr) — runs on GitHub Actions
// (open network). Goal: discover whether we can fetch FR manga scans server-side
// and in what shape, so the Cloudflare Worker source can be built on facts, not
// guesses. Prints real results: page reachability, the scan reader's episodes.js,
// extracted image URLs, and an actual image fetch.

const BASE = "https://anime-sama.fr";
const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
};

async function head(label, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, redirect: "follow" });
    const ct = r.headers.get("content-type") || "";
    const txt = ct.includes("text") || ct.includes("javascript") || ct.includes("json") ? await r.text() : null;
    const len = txt ? txt.length : Number(r.headers.get("content-length") || 0);
    console.log(`  ${r.ok ? "✅" : "❌"} ${label}: ${r.status} ${ct} ${len}B`);
    return { ok: r.ok, status: r.status, ct, txt, headers: r.headers };
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    return { ok: false };
  }
}

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

console.log("==================== reachability ====================");
const home = await head("homepage", `${BASE}/`);
if (home.txt) {
  const cat = (home.txt.match(/\/catalogue\/[a-z0-9-]+/gi) || []).slice(0, 8);
  console.log("    sample catalogue links:", [...new Set(cat)].slice(0, 8).join(", ") || "(none in HTML — JS-rendered)");
}

console.log("\n==================== search endpoints ====================");
// Try the known search backends Anime-Sama has used.
await head("searchbar.php?q=chainsaw", `${BASE}/catalogue/searchbar.php?query=chainsaw`);
await head("template fetch (POST-less GET)", `${BASE}/template-php/defaut/fetch.php?query=chainsaw`);
const cataloguePage = await head("catalogue?search=chainsaw", `${BASE}/catalogue/index.php?search=chainsaw`);
if (cataloguePage.txt) {
  const found = (cataloguePage.txt.match(/\/catalogue\/[a-z0-9-]+/gi) || []);
  console.log("    matches:", [...new Set(found)].slice(0, 10).join(", ") || "(none)");
}

console.log("\n==================== scan reader (the core) ====================");
const titles = ["Chainsaw Man", "Solo Leveling", "One Piece", "Jujutsu Kaisen"];
for (const t of titles) {
  const slug = slugify(t);
  console.log(`\n  --- ${t}  (slug: ${slug}) ---`);
  // The scan reader and its episode/data file.
  const reader = await head("scan/vf page", `${BASE}/catalogue/${slug}/scan/vf/`);
  const epjs = await head("scan/vf/episodes.js", `${BASE}/catalogue/${slug}/scan/vf/episodes.js`);
  const src = epjs.txt || reader.txt || "";
  if (src) {
    // episodes.js typically defines: var eps1 = [ "imgUrl", ... ]; var eps2 = [...]
    const arrays = src.match(/var\s+eps\d+\s*=\s*\[[^\]]*\]/gi) || [];
    console.log(`    chapter arrays (epsN): ${arrays.length}`);
    const firstUrls = (src.match(/https?:\/\/[^"'\s\]]+\.(?:jpg|jpeg|png|webp)/gi) || []);
    console.log(`    image URLs found: ${firstUrls.length}`);
    if (firstUrls[0]) {
      console.log(`    first image: ${firstUrls[0].slice(0, 90)}`);
      const img = await head("→ fetch first image", firstUrls[0], { headers: { Referer: `${BASE}/` } });
      if (img.status) console.log(`    image host: ${new URL(firstUrls[0]).hostname}`);
    }
  }
}

console.log("\n──────────────────────────────────────────────");
console.log("probe-animesama terminé — lis les ✅/❌ ci-dessus");
