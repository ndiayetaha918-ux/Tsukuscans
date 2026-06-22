// Through the user's gateway: (1) does smarter MangaDex matching find readable
// FR for mainstream titles? (2) does Comick reach + have FR scans to fill the
// gap? Decides whether Comick is worth wiring as the second source.

const GW = (process.env.GATEWAY_URL || "https://rocky-vicuna-3084.ndiayetaha918-ux.deno.net").replace(/\/+$/, "");
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

async function gj(path) {
  const r = await fetch(GW + path);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// --- MangaDex: pick the entry (out of several) with the most readable FR chapters
async function mdReadableFr(id) {
  let kept = 0;
  for (let off = 0; off < 500; off += 100) {
    const j = await gj(`/md/manga/${id}/feed?translatedLanguage[]=fr&${CT}&order[chapter]=asc&limit=100&offset=${off}`);
    if (!j.data?.length) break;
    for (const c of j.data) if (c.attributes.pages && !c.attributes.externalUrl) kept++;
    if (j.data.length < 100) break;
  }
  return kept;
}
async function mdBest(title) {
  const s = await gj(`/md/manga?title=${encodeURIComponent(title)}&limit=8&${CT}&order[relevance]=desc&availableTranslatedLanguage[]=fr`);
  let best = 0, bestName = "—";
  for (const m of s.data || []) {
    const n = await mdReadableFr(m.id).catch(() => 0);
    if (n > best) { best = n; bestName = m.attributes.title?.en || Object.values(m.attributes.title || {})[0]; }
  }
  return { best, bestName };
}

// --- Comick
async function ckFr(title) {
  const list = await gj(`/ck/v1.0/search?q=${encodeURIComponent(title)}&limit=5`).catch(() => null);
  if (!Array.isArray(list) || !list[0]) return { hid: null, count: 0, pages: 0 };
  const hid = list[0].hid;
  const d = await gj(`/ck/comic/${hid}/chapters?lang=fr&limit=100&chap-order=1`).catch(() => null);
  const chapters = d?.chapters || [];
  let pages = 0;
  if (chapters[0]) {
    const im = await gj(`/ck/chapter/${chapters[0].hid}/get_images`).catch(() => null);
    pages = Array.isArray(im) ? im.length : 0;
  }
  return { hid, count: chapters.length, pages, title: list[0].title };
}

const titles = ["One Piece", "Naruto", "Jujutsu Kaisen", "Demon Slayer", "Dandadan", "Solo Leveling", "Chainsaw Man", "My Hero Academia"];
console.log(`Gateway: ${GW}\n`);
for (const t of titles) {
  let md = { best: 0, bestName: "—" }, ck = { count: 0, pages: 0 };
  try { md = await mdBest(t); } catch (e) { md.bestName = "err " + e.message; }
  try { ck = await ckFr(t); } catch (e) { ck.title = "err " + e.message; }
  console.log(`  ${t.padEnd(18)} | MangaDex(best): ${String(md.best).padStart(3)} ch  | Comick: ${String(ck.count).padStart(3)} ch FR${ck.pages ? `, ${ck.pages}p/ch1` : ""}  ${ck.count ? "✅" : ""}`);
}
console.log("\nSi Comick montre des chapitres FR là où MangaDex est à 0 → on le câble comme 2e source.");
