// Verify a user's DEPLOYED gateway end to end (runs on GitHub Actions, open net).
// Proves the live instance returns real FR scan data WITH the CORS header a
// browser needs — before the user relies on it. No promises, just results.

const GW = (process.env.GATEWAY_URL || "https://rocky-vicuna-3084.ndiayetaha918-ux.deno.net").replace(/\/+$/, "");
const ORIGIN = "https://ndiayetaha918-ux.github.io";
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

let ok = true;
const fail = (m) => { ok = false; console.log("  ❌ " + m); };

async function get(path) {
  const r = await fetch(GW + path, { headers: { Origin: ORIGIN } });
  return r;
}

console.log(`Testing gateway: ${GW}\n`);

try {
  // 1) Health
  const h = await get("/");
  const hj = await h.json().catch(() => ({}));
  const acaoH = h.headers.get("access-control-allow-origin") || "∅";
  if (h.status === 200 && hj.ok) console.log(`  ✅ santé: 200 ${JSON.stringify(hj)}  CORS=${acaoH}`);
  else fail(`santé inattendue: ${h.status} ${JSON.stringify(hj)}`);

  // 2) MangaDex search through the gateway, with CORS check
  const s = await get(`/md/manga?title=${encodeURIComponent("Chainsaw Man")}&limit=1&${CT}&order[relevance]=desc`);
  const acao = s.headers.get("access-control-allow-origin") || "∅";
  const sj = await s.json().catch(() => ({}));
  const id = sj.data?.[0]?.id;
  if (id && (acao === "*" || acao === ORIGIN)) console.log(`  ✅ recherche MangaDex: ok (CORS=${acao}) manga=${id}`);
  else fail(`recherche: status ${s.status} id=${id} CORS=${acao}`);

  if (id) {
    // 3) FR feed + at-home + image through the gateway
    const f = await get(`/md/manga/${id}/feed?translatedLanguage[]=fr&${CT}&order[chapter]=asc&limit=5&includes[]=scanlation_group`);
    const fj = await f.json().catch(() => ({}));
    const ch = (fj.data || []).find((c) => c.attributes?.pages);
    if (ch) {
      console.log(`  ✅ chapitres FR: ${fj.total} (ex. ch.${ch.attributes.chapter} par ${ch.relationships?.find((r) => r.type === "scanlation_group")?.attributes?.name})`);
      const ah = await get(`/md/at-home/server/${ch.id}`);
      const aj = await ah.json().catch(() => ({}));
      const file = aj.chapter?.data?.[0];
      if (file) {
        const imgUrl = `/img?u=${encodeURIComponent(`${aj.baseUrl}/data/${aj.chapter.hash}/${file}`)}`;
        const img = await get(imgUrl);
        const buf = await img.arrayBuffer();
        const acaoI = img.headers.get("access-control-allow-origin") || "∅";
        if (img.status === 200 && buf.byteLength > 5000 && (acaoI === "*" || acaoI === ORIGIN))
          console.log(`  ✅ image de page: 200 ${(buf.byteLength / 1024 | 0)}KB ${img.headers.get("content-type")} CORS=${acaoI}`);
        else fail(`image: ${img.status} ${(buf.byteLength / 1024 | 0)}KB CORS=${acaoI}`);
      } else fail("at-home: pas de pages");
    } else fail("feed FR: aucun chapitre avec pages");
  }
} catch (e) {
  fail("exception: " + e.message);
}

console.log("\n──────────────────────────────────────────────");
console.log(ok
  ? "✅ PASSERELLE OK — catalogue FR complet lisible à la demande à travers cette adresse."
  : "❌ La passerelle ne répond pas comme attendu (voir ci-dessus). Vérifie l'adresse / le déploiement.");
process.exit(ok ? 0 : 1);
