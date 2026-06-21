// Linchpin test for a ZERO-intervention reader with NO relay and NO deploy:
// - Chapter metadata (hash + filenames) can be pre-fetched by scheduled GitHub
//   Actions and committed as static JSON (no CORS problem: served from Pages).
// - Page images load via <img>, which ignores CORS — IF we have a STABLE image
//   URL. The /at-home/server baseUrl rotates and its token expires (~15 min), so
//   it can't be cached. The question: does the canonical, stable host
//   uploads.mangadex.org/data/{hash}/{file} serve images directly? If yes, we can
//   cache metadata daily and hotlink stable images — real FR scans, zero setup.

const MD = "https://api.mangadex.org";
const UA = { "User-Agent": "TsukuProbe/1.0 (+https://github.com/ndiayetaha918-ux/Tsukuscans)" };

async function j(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function tryImg(label, url, headers) {
  try {
    const r = await fetch(url, { headers });
    const buf = await r.arrayBuffer();
    const ok = r.ok && buf.byteLength > 2048;
    console.log(`  ${ok ? "✅" : "❌"} ${label}: ${r.status} ${(buf.byteLength / 1024 | 0)}KB ${r.headers.get("content-type")}`);
    return ok;
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    return false;
  }
}

const s = await j(`${MD}/manga?title=${encodeURIComponent("Chainsaw Man")}&limit=1&contentRating[]=safe&order[relevance]=desc`);
const id = s.data[0].id;
const f = await j(`${MD}/manga/${id}/feed?translatedLanguage[]=fr&order[chapter]=asc&limit=1&includes[]=scanlation_group`);
const ch = f.data[0];
const ah = await j(`${MD}/at-home/server/${ch.id}`);
const hash = ah.chapter.hash;
const file = ah.chapter.data[0];
const fileLow = ah.chapter.dataSaver?.[0];

console.log(`Chapter ${ch.attributes.chapter} (${ch.relationships.find((r) => r.type === "scanlation_group")?.attributes?.name})`);
console.log(`hash=${hash}`);
console.log(`@Home baseUrl=${ah.baseUrl}`);
console.log("");

console.log("== @Home node (rotates / token, NOT cacheable) ==");
await tryImg("@Home data", `${ah.baseUrl}/data/${hash}/${file}`, UA);

console.log("\n== uploads.mangadex.org (STABLE, cacheable) — the linchpin ==");
const stableHi = await tryImg("uploads /data (no referer)", `https://uploads.mangadex.org/data/${hash}/${file}`, UA);
await tryImg("uploads /data (referer mangadex.org)", `https://uploads.mangadex.org/data/${hash}/${file}`, { ...UA, Referer: "https://mangadex.org/" });
if (fileLow) await tryImg("uploads /data-saver (no referer)", `https://uploads.mangadex.org/data-saver/${hash}/${fileLow}`, UA);

console.log("\n──────────────────────────────────────────────");
console.log(stableHi
  ? "✅ STABLE IMAGE HOST WORKS → zero-intervention reader is buildable (cache metadata via Actions, hotlink uploads.mangadex.org via <img>)."
  : "❌ uploads.mangadex.org does not serve directly → must use @Home (live, token) → a live relay/gateway is unavoidable.");
console.log("probe-uploads terminé");
