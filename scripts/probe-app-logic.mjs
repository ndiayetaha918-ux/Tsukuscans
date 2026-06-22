// Replicates the app's FIXED reading logic through the user's gateway, for many
// popular titles, so we see real coverage: which have readable FR scans (and how
// many chapters) vs which are external-only (MangaPlus → not readable as scans).

const GW = (process.env.GATEWAY_URL || "https://rocky-vicuna-3084.ndiayetaha918-ux.deno.net").replace(/\/+$/, "");
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

async function gj(path) {
  const r = await fetch(GW + path);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function readableFr(id) {
  const seen = new Set();
  let kept = 0, external = 0, sample = null;
  for (let off = 0; off < 1000; off += 100) {
    const j = await gj(`/md/manga/${id}/feed?translatedLanguage[]=fr&${CT}&order[volume]=asc&order[chapter]=asc&limit=100&offset=${off}&includes[]=scanlation_group`);
    if (!j.data.length) break;
    for (const c of j.data) {
      if (!c.attributes.pages || c.attributes.externalUrl) { external++; continue; }
      const num = c.attributes.chapter ?? "";
      if (num && seen.has(num)) continue;
      if (num) seen.add(num);
      kept++;
      if (!sample) sample = c;
    }
    if (j.data.length < 100) break;
  }
  return { kept, external, sample };
}

const titles = process.argv.slice(2).length ? process.argv.slice(2)
  : ["Chainsaw Man", "Naruto", "One Piece", "Bleach", "Berserk", "Jujutsu Kaisen",
     "Solo Leveling", "Demon Slayer", "My Hero Academia", "Dandadan", "Spy x Family", "One Punch-Man"];

console.log(`Gateway: ${GW}\n`);
for (const t of titles) {
  try {
    const s = await gj(`/md/manga?title=${encodeURIComponent(t)}&limit=1&${CT}&order[relevance]=desc`);
    const m = s.data?.[0];
    if (!m) { console.log(`  ❓ ${t.padEnd(18)} introuvable`); continue; }
    const name = m.attributes.title?.en || Object.values(m.attributes.title || {})[0];
    const langs = m.attributes.availableTranslatedLanguages || [];
    if (!langs.includes("fr")) { console.log(`  ⚪ ${t.padEnd(18)} → "${name}" : pas de FR du tout`); continue; }
    const { kept, external, sample } = await readableFr(m.id);
    let pageInfo = "";
    if (sample) {
      try {
        const ah = await gj(`/md/at-home/server/${sample.id}`);
        pageInfo = ` · ch.${sample.attributes.chapter} = ${ah.chapter?.data?.length || 0} pages`;
      } catch { pageInfo = " · (pages indisponibles)"; }
    }
    const icon = kept > 0 ? "✅" : "❌";
    console.log(`  ${icon} ${t.padEnd(18)} → "${name}" : ${kept} chapitres lisibles (${external} externes ignorés)${pageInfo}`);
  } catch (e) {
    console.log(`  ❌ ${t.padEnd(18)} erreur: ${e.message}`);
  }
}
console.log("\n✅ = vrais scans FR lisibles · ❌/⚪ = seulement externes (MangaPlus) ou pas de FR");
