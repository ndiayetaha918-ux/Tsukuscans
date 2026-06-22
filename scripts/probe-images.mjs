// Why Berserk shows the "read at mangadex.org" placeholder, and what fixes it.
// Placeholder image is small (~tens of KB); a real page is hundreds of KB. We
// compare, for a real Berserk FR chapter, three ways to fetch page 1:
//   A) uploads.mangadex.org  DIRECT      (what the browser does now → placeholder)
//   B) gateway /img on uploads URL       (server-side fetch w/ referer)
//   C) gateway /img on the @Home baseUrl (the official per-chapter host)
// Whichever returns a BIG image is the one to ship.

const GW = (process.env.GATEWAY_URL || "https://rocky-vicuna-3084.ndiayetaha918-ux.deno.net").replace(/\/+$/, "");
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

async function gj(path) { const r = await fetch(GW + path); if (!r.ok) throw new Error(String(r.status)); return r.json(); }
async function size(url) {
  try { const r = await fetch(url); const b = await r.arrayBuffer(); return `${r.status} ${(b.byteLength / 1024 | 0)}KB ${r.headers.get("content-type")}`; }
  catch (e) { return "ERR " + e.message; }
}

// Find a Berserk entry that actually has readable FR chapters.
const s = await gj(`/md/manga?title=Berserk&limit=5&${CT}&availableTranslatedLanguage[]=fr&order[relevance]=desc`);
let chId, hash, file, baseUrl;
for (const m of s.data) {
  const f = await gj(`/md/manga/${m.id}/feed?translatedLanguage[]=fr&${CT}&order[chapter]=asc&limit=20&includes[]=scanlation_group`);
  const ch = (f.data || []).find((c) => c.attributes.pages && !c.attributes.externalUrl);
  if (ch) {
    const ah = await gj(`/md/at-home/server/${ch.id}`);
    if (ah.chapter?.data?.length) { chId = ch.id; hash = ah.chapter.hash; file = ah.chapter.data[0]; baseUrl = ah.baseUrl; break; }
  }
}
if (!chId) { console.log("no readable Berserk FR chapter found"); process.exit(0); }

console.log(`Berserk chapter ${chId}`);
console.log(`hash=${hash} file=${file}`);
console.log(`@Home baseUrl=${baseUrl}\n`);

const uploadsUrl = `https://uploads.mangadex.org/data/${hash}/${file}`;
const athomeUrl = `${baseUrl}/data/${hash}/${file}`;

console.log("A) uploads DIRECT (browser path now) :", await size(uploadsUrl));
console.log("B) gateway /img on uploads          :", await size(`${GW}/img?u=${encodeURIComponent(uploadsUrl)}`));
console.log("C) gateway /img on @Home baseUrl     :", await size(`${GW}/img?u=${encodeURIComponent(athomeUrl)}`));
console.log("\nGros KB = vraie page · petit KB = placeholder. On ship la méthode 'grosse'.");
