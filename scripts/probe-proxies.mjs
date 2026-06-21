// Can reading work with ZERO deployment? MangaDex's JSON API sends no CORS
// header, so a static-site browser must route those small JSON calls through a
// public CORS proxy. This tests each candidate end to end against real MangaDex
// (search → FR feed → at-home server) and reports which actually work, so we
// know whether the no-deploy path is viable or the gateway is truly required.

const ORIGIN = "https://ndiayetaha918-ux.github.io";
const MD = "https://api.mangadex.org";
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

const PROXIES = {
  "allorigins/raw": (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  "corsproxy.io": (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  "codetabs": (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  "thingproxy": (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
};

async function viaJSON(wrap, url) {
  const r = await fetch(wrap(url), { headers: { Origin: ORIGIN, Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const acao = r.headers.get("access-control-allow-origin") || "∅";
  const j = await r.json();
  return { j, acao };
}

for (const [name, wrap] of Object.entries(PROXIES)) {
  console.log(`\n==================== ${name} ====================`);
  const t0 = Date.now();
  try {
    const s = await viaJSON(wrap, `${MD}/manga?title=${encodeURIComponent("Chainsaw Man")}&limit=1&${CT}&order[relevance]=desc`);
    if (s.acao !== "*" && s.acao !== ORIGIN) {
      console.log(`  ❌ search returned data but ACAO=${s.acao} → a browser would still block it`);
      continue;
    }
    const id = s.j.data?.[0]?.id;
    console.log(`  search ok (ACAO=${s.acao}) manga=${id}`);
    const f = await viaJSON(wrap, `${MD}/manga/${id}/feed?translatedLanguage[]=fr&${CT}&order[chapter]=asc&limit=3&includes[]=scanlation_group`);
    const ch = f.j.data?.[0];
    console.log(`  FR feed ok: total=${f.j.total} first=ch.${ch?.attributes?.chapter} by ${ch?.relationships?.find((r) => r.type === "scanlation_group")?.attributes?.name}`);
    const ah = await viaJSON(wrap, `${MD}/at-home/server/${ch.id}`);
    const pages = ah.j.chapter?.data?.length;
    console.log(`  at-home ok: ${pages} pages, base=${ah.j.baseUrl?.slice(0, 40)}…`);
    console.log(`  ✅ ${name} FULLY WORKS for zero-deploy reading  (${Date.now() - t0}ms)`);
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}  (${Date.now() - t0}ms)`);
  }
}
console.log("\nproxy probe terminé — ✅ rows are viable zero-deploy reading paths");
