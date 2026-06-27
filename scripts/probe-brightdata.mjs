// Auto-discover Bright Data zone name + test Web Unlocker against anime-sama.
// BD_TOKEN falls back to the hardcoded token for first-run zone discovery.

const TOKEN = process.env.BD_TOKEN || "efb56aa0-fe8b-411d-b4d2-adf7110cdee1";
const AS_URL = "https://anime-sama.fr/catalogue/haikyuu/scan/fr/";
const BD_API = "https://api.brightdata.com";

function hdr() {
  return { Authorization: `Bearer ${TOKEN}`, Accept: "application/json", "Content-Type": "application/json" };
}
async function get(label, url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, headers: { ...hdr(), ...(opts.headers || {}) }, signal: AbortSignal.timeout(12000) });
    const txt = await r.text();
    console.log(`  ${r.ok ? "✅" : "❌"} ${label}: HTTP ${r.status} — ${txt.length}B`);
    return { ok: r.ok, status: r.status, txt };
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    return { ok: false, txt: "" };
  }
}

// ── 1. List all zones ──────────────────────────────────────────────────────
console.log("═══ 1. Liste des zones Bright Data ═══");
const zonesRes = await get("GET /zone/get_active_zones", `${BD_API}/zone/get_active_zones`);
let zones = [];
if (zonesRes.ok) {
  try {
    zones = JSON.parse(zonesRes.txt);
    for (const z of zones) {
      const type = z.type || z.plan || "?";
      const name = z.name || z.zone;
      console.log(`     • ${name}  type=${type}  status=${z.status ?? z.enabled ?? "?"}`);
    }
  } catch (e) {
    console.log("  parse error:", e.message, zonesRes.txt.slice(0, 300));
  }
}

// Also try alternate endpoint
if (!zonesRes.ok) {
  const r2 = await get("GET /customer", `${BD_API}/customer`);
  if (r2.ok) try { console.log("  customer:", JSON.parse(r2.txt)); } catch {}
}

// ── 2. Direct Web Unlocker API ────────────────────────────────────────────
console.log("\n═══ 2. Web Unlocker Direct API (/request) ═══");
const unlockerZone = zones.find((z) => /(unblocker|web_unlocker|unblock)/i.test(z.type || z.plan || z.name))?.name;
const zonesToTry = [unlockerZone, "unblocker", "web_unlocker1", "web_unlocker"].filter(Boolean);
const triedZones = new Set();

for (const zone of zonesToTry) {
  if (triedZones.has(zone)) continue;
  triedZones.add(zone);
  try {
    const r = await fetch(`${BD_API}/request`, {
      method: "POST",
      headers: hdr(),
      body: JSON.stringify({ zone, url: AS_URL, format: "raw" }),
      signal: AbortSignal.timeout(25000),
    });
    const txt = await r.text();
    const blocked = /captcha|cf-challenge|just a moment|enable javascript/i.test(txt);
    const hasContent = /haikyuu|chapitre|scan|episode/i.test(txt);
    const icon = r.ok && !blocked ? "✅" : "❌";
    console.log(`  ${icon} zone="${zone}": HTTP ${r.status} — ${txt.length}B${blocked ? " ⚠️ CHALLENGE" : ""}${hasContent ? " ✨ CONTENU OK" : ""}`);
    if (r.ok && !blocked && hasContent) {
      // Extract chapter URLs for display
      const m = txt.match(/panneauScan\s*=\s*(\{[\s\S]*?\})/);
      if (m) {
        try {
          const obj = JSON.parse(m[1].replace(/'/g, '"'));
          const chs = Object.keys(obj);
          console.log(`     → ${chs.length} chapitres détectés (${chs[0]} → ${chs[chs.length - 1]})`);
          console.log(`     → Exemple URL: ${Object.values(obj)[0]}`);
        } catch {}
      }
      // Sample image URL
      const imgM = txt.match(/listImagesPage\s*=\s*(\[[\s\S]*?\])/);
      if (imgM) try { const imgs = JSON.parse(imgM[1].replace(/'/g, '"')); console.log(`     → ${imgs.length} images, ex: ${imgs[0]}`); } catch {}
      console.log(`\n  🎉 ZONE FONCTIONNELLE : BD_ZONE=${zone}`);
      break;
    }
    if (!r.ok) {
      // Show error body for diagnosis
      console.log(`     Erreur: ${txt.slice(0, 300)}`);
    }
  } catch (e) {
    console.log(`  ❌ zone="${zone}": ${e.message}`);
  }
}

// ── 3. Summary ─────────────────────────────────────────────────────────────
console.log("\n═══ 3. Résumé ═══");
if (zones.length) {
  console.log("  Zones disponibles dans ton compte Bright Data :");
  for (const z of zones) {
    const name = z.name || z.zone;
    const type = z.type || z.plan;
    console.log(`    BD_ZONE=${name}  (${type})`);
  }
  console.log("\n  Prochaine étape : dans Deno Deploy → ton projet → Settings → Env Vars");
  console.log("  Ajouter : BD_TOKEN=efb56aa0-...  BD_ZONE=<valeur ci-dessus>");
} else {
  console.log("  Aucune zone retournée — vérifiez l'endpoint et le token.");
  console.log(`  Token (début) : ${TOKEN.slice(0, 8)}...`);
}
