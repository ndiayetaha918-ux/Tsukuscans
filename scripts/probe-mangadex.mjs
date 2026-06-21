// Ground-truth probe: runs on GitHub Actions (open network) to PROVE whether
// real French MangaDex chapters + page images are fetchable end to end.
// No promises — this prints actual results.

const API = "https://api.mangadex.org";
const UA = { "User-Agent": "TsukuProbe/1.0 (+https://github.com/ndiayetaha918-ux/Tsukuscans)" };

async function j(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const titles = process.argv.slice(2);
const probe = titles.length ? titles : ["Chainsaw Man", "Solo Leveling", "One Piece"];

for (const title of probe) {
  console.log(`\n==================== ${title} ====================`);
  try {
    const s = await j(`${API}/manga?title=${encodeURIComponent(title)}&limit=1&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`);
    const m = s.data[0];
    if (!m) { console.log("  introuvable"); continue; }
    const id = m.id;
    const t = m.attributes.title;
    console.log("  manga:", id, "|", t.en || Object.values(t)[0]);
    console.log("  langues dispo:", (m.attributes.availableTranslatedLanguages || []).join(", "));

    for (const lang of ["fr", "en"]) {
      const f = await j(`${API}/manga/${id}/feed?translatedLanguage[]=${lang}&order[chapter]=asc&limit=5&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`);
      const groups = f.data.slice(0, 5).map((c) => `${c.attributes.chapter}[${c.relationships.find((r) => r.type === "scanlation_group")?.attributes?.name || "?"}]`);
      console.log(`  [${lang}] ${f.total} chapitres · ex:`, groups.join(" "));
      if (f.data.length) {
        const ch = f.data[0].id;
        const ah = await j(`${API}/at-home/server/${ch}`);
        const n = ah.chapter.data.length;
        const url = `${ah.baseUrl}/data/${ah.chapter.hash}/${ah.chapter.data[0]}`;
        const img = await fetch(url, { headers: UA });
        const buf = await img.arrayBuffer();
        console.log(`  [${lang}] ch.${f.data[0].attributes.chapter}: ${n} pages · page1 ${img.status} ${(buf.byteLength / 1024 | 0)}KB ${img.headers.get("content-type")}`);
      }
    }
  } catch (e) {
    console.log("  ERREUR:", e.message);
  }
}
console.log("\nprobe terminé");
