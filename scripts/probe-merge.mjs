// Verify the merge: does combining all FR-available entries (normal + colour +
// re-scans) yield MORE chapters (fewer gaps) than the single best entry, and how
// many colour chapters do we get? Replicates the app's new logic via the gateway.

const GW = (process.env.GATEWAY_URL || "https://rocky-vicuna-3084.ndiayetaha918-ux.deno.net").replace(/\/+$/, "");
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

async function gj(p) { const r = await fetch(GW + p); if (!r.ok) throw new Error(String(r.status)); return r.json(); }

async function candidates(title) {
  const j = await gj(`/md/manga?title=${encodeURIComponent(title)}&limit=8&${CT}&availableTranslatedLanguage[]=fr&order[relevance]=desc`);
  return (j.data || []).map((m) => {
    const names = [...Object.values(m.attributes.title || {}), ...(m.attributes.altTitles || []).flatMap((a) => Object.values(a))].join(" ").toLowerCase();
    return { id: m.id, colored: /colou?r|couleur/.test(names) };
  });
}
async function readableFr(id) {
  const out = [];
  for (let off = 0; off < 1000; off += 100) {
    const j = await gj(`/md/manga/${id}/feed?translatedLanguage[]=fr&${CT}&order[chapter]=asc&limit=100&offset=${off}`);
    if (!j.data?.length) break;
    for (const c of j.data) if (c.attributes.pages && !c.attributes.externalUrl) out.push(c.attributes.chapter ?? "—");
    if (j.data.length < 100) break;
  }
  return out;
}

for (const t of ["Chainsaw Man", "Demon Slayer", "Berserk", "One Piece", "Solo Leveling"]) {
  try {
    const cands = await candidates(t);
    let bestSingle = 0;
    const byNum = new Map();
    for (const c of cands) {
      const nums = await readableFr(c.id);
      bestSingle = Math.max(bestSingle, nums.length);
      for (const n of nums) { const cur = byNum.get(n); if (!cur || (c.colored && !cur)) byNum.set(n, c.colored); }
    }
    const color = [...byNum.values()].filter(Boolean).length;
    console.log(`  ${t.padEnd(16)} | fiches FR: ${cands.length} | meilleure seule: ${String(bestSingle).padStart(3)} | FUSION: ${String(byNum.size).padStart(3)} chap (${color} en couleur)`);
  } catch (e) {
    console.log(`  ${t.padEnd(16)} | erreur ${e.message}`);
  }
}
console.log("\nFUSION > meilleure seule = trous comblés. (couleur) = chapitres servis en couleur.");
