// Discovers Bright Data products available (zones, datasets, collectors)
// and tests real-time chapter fetching from anime-sama.to.

const TOKEN = process.env.BD_TOKEN || "efb56aa0-fe8b-411d-b4d2-adf7110cdee1";
const BD = "https://api.brightdata.com";
const AS_SLUG = "haikyuu";
const AS_URL  = `https://anime-sama.to/catalogue/${AS_SLUG}/scan/fr/`;

function hdr(json = true) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}
async function api(label, path, opts = {}) {
  try {
    const r = await fetch(`${BD}${path}`, {
      headers: hdr(!!opts.body),
      signal: AbortSignal.timeout(12000),
      ...opts,
    });
    const txt = await r.text();
    let obj;
    try { obj = JSON.parse(txt); } catch { obj = null; }
    const icon = r.ok ? "✅" : "❌";
    console.log(`  ${icon} ${label}: HTTP ${r.status} — ${txt.length}B`);
    return { ok: r.ok, status: r.status, txt, obj };
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    return { ok: false, txt: "", obj: null };
  }
}

// ── 1. Account / zones ─────────────────────────────────────────────────────
console.log("═══ 1. Zones (proxy) ═══");
const zones = await api("GET /zone/get_active_zones", "/zone/get_active_zones");
if (zones.obj?.length) {
  for (const z of zones.obj) console.log(`     • ${z.name}  type=${z.type || z.plan}`);
} else {
  console.log("     → 0 zones (pas de Web Unlocker configuré)");
}

// ── 2. Datasets (Collector / Web Scraper IDE) ─────────────────────────────
console.log("\n═══ 2. Datasets / Collectors ═══");
const ds = await api("GET /datasets/v3", "/datasets/v3");
let datasetId = null;
if (ds.obj?.datasets?.length || Array.isArray(ds.obj)) {
  const list = Array.isArray(ds.obj) ? ds.obj : (ds.obj.datasets || []);
  console.log(`  ${list.length} dataset(s) :`);
  for (const d of list) {
    const id = d.id || d.dataset_id;
    const name = d.name || d.title || id;
    console.log(`     • ${id}  "${name}"  status=${d.status || "?"}`);
    if (!datasetId) datasetId = id;
  }
} else {
  console.log("  → Aucun dataset trouvé via /datasets/v3");
  // Try alternate endpoint
  const ds2 = await api("GET /dca/dataset/list", "/dca/dataset/list");
  if (ds2.obj && !ds2.obj.error) console.log("     /dca:", JSON.stringify(ds2.obj).slice(0, 300));
}

// ── 3. Custom collectors (Web Scraper IDE) ────────────────────────────────
console.log("\n═══ 3. Collectors (Web Scraper IDE) ═══");
const col = await api("GET /dca/collector/list", "/dca/collector/list");
let collectorId = null;
if (col.ok && Array.isArray(col.obj)) {
  console.log(`  ${col.obj.length} collector(s) :`);
  for (const c of col.obj) {
    const id = c.id || c.collector_id || c.queue_id;
    const name = c.name || c.title || id;
    console.log(`     • ${id}  "${name}"`);
    // Pick the one related to anime-sama if possible
    if (!collectorId || /anime|manga/i.test(name)) collectorId = id;
  }
} else {
  console.log("  → Aucun collecteur trouvé");
}

// ── 4. Trigger on-demand scrape if we found a dataset or collector ─────────
if (datasetId || collectorId) {
  console.log("\n═══ 4. Test trigger on-demand (anime-sama Haïkyū) ═══");

  if (datasetId) {
    console.log(`  → Trigger dataset ${datasetId} pour ${AS_URL}`);
    const t = await api(
      `POST /datasets/v3/trigger?dataset_id=${datasetId}`,
      `/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`,
      { method: "POST", body: JSON.stringify([{ url: AS_URL }]) }
    );
    if (t.ok && t.obj?.snapshot_id) {
      const snapId = t.obj.snapshot_id;
      console.log(`  snapshot_id = ${snapId} — attente 15s...`);
      await new Promise((r) => setTimeout(r, 15000));
      const progress = await api(`GET /datasets/v3/progress/${snapId}`, `/datasets/v3/progress/${snapId}`);
      console.log(`  Progression: ${JSON.stringify(progress.obj).slice(0, 200)}`);
      if (progress.obj?.status === "ready" || progress.obj?.progress === 100) {
        const result = await api(`GET /datasets/v3/download/${snapId}`, `/datasets/v3/download/${snapId}`);
        console.log(`  Résultat (début): ${result.txt.slice(0, 500)}`);
      } else {
        console.log(`  Pas encore prêt — relance manuelle: GET ${BD}/datasets/v3/download/${snapId}`);
      }
    }
  }

  if (!datasetId && collectorId) {
    console.log(`  → Trigger collector ${collectorId} pour ${AS_URL}`);
    const t = await api(
      `POST /dca/trigger?collector=${collectorId}`,
      `/dca/trigger?collector=${collectorId}&queue_next=1`,
      { method: "POST", body: JSON.stringify([{ url: AS_URL }]) }
    );
    console.log(`  Réponse: ${JSON.stringify(t.obj).slice(0, 300)}`);
  }
} else {
  console.log("\n═══ 4. Trigger — SKIPPED (pas de dataset/collector trouvé) ═══");
}

// ── 5. Test anime-sama.to direct (sans proxy) ─────────────────────────────
console.log("\n═══ 5. anime-sama.to direct (depuis CI / datacenter) ═══");
try {
  const r = await fetch(AS_URL, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "fr-FR,fr;q=0.9" },
    signal: AbortSignal.timeout(10000),
  });
  const txt = await r.text();
  const blocked = /just a moment|cf-challenge|captcha|enable javascript/i.test(txt);
  const hasCh = /panneau|chapitre|chapter|listImages/i.test(txt);
  console.log(`  ${r.ok && !blocked ? "✅" : "❌"} HTTP ${r.status} — ${txt.length}B${blocked ? " ⚠️ CLOUDFLARE" : ""}${hasCh ? " ✨ CONTENU" : ""}`);
} catch (e) {
  console.log(`  ❌ ${e.message}`);
}

// ── 6. Résumé ──────────────────────────────────────────────────────────────
console.log("\n═══ 6. Résumé ═══");
console.log(`  Zone (proxy): ${zones.obj?.length ? zones.obj.map((z) => z.name).join(", ") : "0 zone"}`);
console.log(`  Dataset ID: ${datasetId || "inconnu"}`);
console.log(`  Collector ID: ${collectorId || "inconnu"}`);
if (datasetId) {
  console.log(`\n  → Pour toi : BD_DATASET=${datasetId}`);
  console.log(`    Ajoute ça dans Deno Deploy → Settings → Env Vars`);
}
if (!datasetId && !collectorId) {
  console.log(`\n  → Aucun produit Bright Data utilisable trouvé.`);
  console.log(`    Solution : Proxies & Scraping → "Add zone" → "Web Unlocker" → nom "manga"`);
}
