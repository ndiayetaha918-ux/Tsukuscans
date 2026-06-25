// Two questions for the user's "need a real catalogue" demand:
//  1) What does Haikyuu look like on MangaDex FR (merged)?
//  2) Is ANY other FR source reachable from a server (datacenter IP, like the
//     gateway)? We test Bato.to and Comick directly from Actions — if they're
//     Cloudflare-challenged / refused here, they'll be refused from Deno too.

const GW = (process.env.GATEWAY_URL || "https://rocky-vicuna-3084.ndiayetaha918-ux.deno.net").replace(/\/+$/, "");
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "fr-FR,fr;q=0.9" };

async function gj(p) { const r = await fetch(GW + p); if (!r.ok) throw new Error(String(r.status)); return r.json(); }

async function get(label, url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, signal: ctrl.signal });
    const ct = r.headers.get("content-type") || "";
    const txt = await r.text();
    const challenge = /just a moment|cf-challenge|challenge-platform|enable javascript|attention required/i.test(txt);
    console.log(`  ${r.ok && !challenge ? "✅" : "❌"} ${label}: ${r.status} ${ct.split(";")[0]} ${txt.length}B${challenge ? " ⚠️CLOUDFLARE-CHALLENGE" : ""}`);
    return { ok: r.ok && !challenge, status: r.status, txt };
  } catch (e) { console.log(`  ❌ ${label}: ${e.name === "AbortError" ? "TIMEOUT" : e.message}`); return { ok: false }; }
  finally { clearTimeout(t); }
}

// 1) Haikyuu on MangaDex (merged, like the app)
console.log("==================== Haikyuu — MangaDex FR (fusion) ====================");
try {
  const s = await gj(`/md/manga?title=${encodeURIComponent("Haikyuu")}&limit=8&${CT}&availableTranslatedLanguage[]=fr&order[relevance]=desc`);
  const byNum = new Map();
  for (const m of s.data || []) {
    const names = [...Object.values(m.attributes.title || {}), ...(m.attributes.altTitles || []).flatMap((a) => Object.values(a))].join(" ").toLowerCase();
    const colored = /colou?r|couleur/.test(names);
    for (let off = 0; off < 1000; off += 100) {
      const f = await gj(`/md/manga/${m.id}/feed?translatedLanguage[]=fr&${CT}&order[chapter]=asc&limit=100&offset=${off}`);
      if (!f.data?.length) break;
      for (const c of f.data) if (c.attributes.pages && !c.attributes.externalUrl) { const n = c.attributes.chapter ?? "—"; if (!byNum.has(n) || colored) byNum.set(n, colored); }
      if (f.data.length < 100) break;
    }
  }
  console.log(`  → ${byNum.size} chapitres FR lisibles (Haikyuu a 402 chapitres au total au Japon)`);
} catch (e) { console.log("  erreur:", e.message); }

// 2) Other sources reachable from a server?
console.log("\n==================== Autres sources (depuis un serveur) ====================");
await get("Bato.to home", "https://bato.to/");
await get("Bato.to search haikyuu", "https://bato.to/v3x-search?word=haikyuu");
await get("Comick API search haikyuu", "https://api.comick.fun/v1.0/search?q=haikyuu&limit=3");
await get("MangaFire home", "https://mangafire.to/");
await get("Weeb Central search", "https://weebcentral.com/search?text=haikyuu");

console.log("\nUn ✅ avec du JSON/HTML exploitable = source serveur viable. Un ❌/CHALLENGE = bloqué comme le reste.");
