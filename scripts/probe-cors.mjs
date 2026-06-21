// Decisive CORS probe: does each source send the headers a real browser needs?
// Runs on GitHub Actions (open network). A browser on our static site can call
// an API directly IFF the response carries Access-Control-Allow-Origin matching
// our Origin (or "*"). Images shown via <img> never need CORS, so we only test
// that they return bytes. No promises — this prints the actual headers.

const ORIGIN = "https://ndiayetaha918-ux.github.io";

async function cors(label, url, opts = {}) {
  // Preflight (OPTIONS) — what the browser sends before a non-simple request.
  let pre = "—";
  try {
    const o = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "accept",
      },
    });
    pre = `${o.status} ACAO=${o.headers.get("access-control-allow-origin") || "∅"}`;
  } catch (e) {
    pre = `ERR ${e.message}`;
  }
  // Actual GET with Origin set.
  try {
    const r = await fetch(url, { headers: { Origin: ORIGIN, Accept: "application/json", ...(opts.headers || {}) } });
    const acao = r.headers.get("access-control-allow-origin") || "∅";
    const ok = acao === "*" || acao === ORIGIN;
    console.log(`  ${ok ? "✅" : "❌"} ${label}`);
    console.log(`       GET ${r.status}  ACAO=${acao}  preflight=[${pre}]`);
    return { ok, status: r.status, acao };
  } catch (e) {
    console.log(`  ❌ ${label}  GET ERR ${e.message}  preflight=[${pre}]`);
    return { ok: false };
  }
}

async function imgBytes(label, url) {
  try {
    const r = await fetch(url, { headers: { Origin: ORIGIN } });
    const b = await r.arrayBuffer();
    console.log(`  ${r.ok && b.byteLength > 1024 ? "✅" : "❌"} ${label}: ${r.status} ${(b.byteLength / 1024 | 0)}KB ${r.headers.get("content-type")} (img tag ignores CORS)`);
  } catch (e) {
    console.log(`  ❌ ${label}: ERR ${e.message}`);
  }
}

console.log(`\nOrigin simulated: ${ORIGIN}`);

console.log("\n==================== AniList (browse) ====================");
await cors("AniList GraphQL", "https://graphql.anilist.co", { headers: { "content-type": "application/json" } });

console.log("\n==================== MangaDex (reading) ====================");
const md = await cors("api.mangadex.org manga search", "https://api.mangadex.org/manga?limit=1");
let mdImg = null;
try {
  const s = await (await fetch("https://api.mangadex.org/manga?title=Chainsaw%20Man&limit=1")).json();
  const id = s.data[0].id;
  const f = await (await fetch(`https://api.mangadex.org/manga/${id}/feed?translatedLanguage[]=fr&limit=1&includes[]=scanlation_group`)).json();
  if (f.data[0]) {
    const ah = await (await fetch(`https://api.mangadex.org/at-home/server/${f.data[0].id}`)).json();
    mdImg = `${ah.baseUrl}/data/${ah.chapter.hash}/${ah.chapter.data[0]}`;
    console.log(`  FR chapter found: ch.${f.data[0].attributes.chapter} by ${f.data[0].relationships.find((r) => r.type === "scanlation_group")?.attributes?.name}`);
  }
} catch (e) { console.log("  (chapter lookup err)", e.message); }
if (mdImg) await imgBytes("MangaDex page image", mdImg);

console.log("\n==================== Comick (reading) ====================");
await cors("api.comick.fun search", "https://api.comick.fun/v1.0/search?q=chainsaw&limit=1");

console.log("\n──────────────────────────────────────────────");
console.log("VERDICT: a gateway is only NEEDED for an API whose ACAO is ∅ above.");
console.log("Images (✅ bytes) display via <img> regardless of CORS.");
console.log("probe-cors terminé");
