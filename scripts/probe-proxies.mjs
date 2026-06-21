// Goal: a ZERO-intervention reading path. The browser can't call MangaDex
// directly (no CORS), so we need a public CORS relay baked into the app as the
// default. Test a broad battery end to end against real MangaDex (search → FR
// feed → at-home server) AND require the relay to send a usable CORS header,
// with a per-request timeout so dead relays don't hang the probe. Survivors get
// wired in as automatic fallbacks. No promises — this prints what actually works.

const ORIGIN = "https://ndiayetaha918-ux.github.io";
const MD = "https://api.mangadex.org";
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";

// Each entry: how to wrap a target URL, and how to read the body (raw vs json-wrapped).
const RELAYS = {
  "allorigins/raw":   { wrap: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, mode: "raw" },
  "allorigins/get":   { wrap: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, mode: "wrapped" },
  "corsproxy.io":     { wrap: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`, mode: "raw" },
  "codetabs":         { wrap: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`, mode: "raw" },
  "cors.eu.org":      { wrap: (u) => `https://cors.eu.org/${u}`, mode: "raw" },
  "cors.workers.dev": { wrap: (u) => `https://test.cors.workers.dev/?${u}`, mode: "raw" },
  "proxy.cors.sh":    { wrap: (u) => `https://proxy.cors.sh/${u}`, mode: "raw" },
  "cors.lol":         { wrap: (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`, mode: "raw" },
  "corsfix":          { wrap: (u) => `https://proxy.corsfix.com/?${u}`, mode: "raw" },
  "thingproxy":       { wrap: (u) => `https://thingproxy.freeboard.io/fetch/${u}`, mode: "raw" },
  "whateverorigin":   { wrap: (u) => `https://www.whateverorigin.org/get?url=${encodeURIComponent(u)}`, mode: "wrapped" },
  "yacdn":            { wrap: (u) => `https://yacdn.org/proxy/${u}`, mode: "raw" },
};

async function get(relay, url, timeout = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(relay.wrap(url), { headers: { Origin: ORIGIN, Accept: "application/json" }, signal: ctrl.signal });
    const acao = r.headers.get("access-control-allow-origin") || "∅";
    if (!r.ok) throw new Error(`HTTP ${r.status} (ACAO=${acao})`);
    let j;
    if (relay.mode === "wrapped") {
      const w = await r.json();
      j = JSON.parse(w.contents);
    } else {
      j = await r.json();
    }
    return { j, acao };
  } finally {
    clearTimeout(t);
  }
}

const results = [];
for (const [name, relay] of Object.entries(RELAYS)) {
  const t0 = Date.now();
  try {
    const s = await get(relay, `${MD}/manga?title=${encodeURIComponent("Chainsaw Man")}&limit=1&${CT}&order[relevance]=desc`);
    const browserOk = s.acao === "*" || s.acao === ORIGIN;
    const id = s.j.data?.[0]?.id;
    if (!id) throw new Error("no manga in response");
    const f = await get(relay, `${MD}/manga/${id}/feed?translatedLanguage[]=fr&${CT}&order[chapter]=asc&limit=3&includes[]=scanlation_group`);
    const ch = f.j.data?.[0];
    if (!ch) throw new Error("no FR chapter");
    const ah = await get(relay, `${MD}/at-home/server/${ch.id}`);
    const pages = ah.j.chapter?.data?.length;
    if (!pages) throw new Error("no pages");
    const ms = Date.now() - t0;
    const verdict = browserOk ? "✅ USABLE" : "⚠️  data ok but ACAO=" + s.acao + " (browser would block)";
    console.log(`${verdict.padEnd(22)} ${name.padEnd(18)} FR ch.${ch.attributes.chapter} · ${pages}p · ${ms}ms`);
    if (browserOk) results.push({ name, ms });
  } catch (e) {
    console.log(`❌ DEAD              ${name.padEnd(18)} ${e.message}  (${Date.now() - t0}ms)`);
  }
}

console.log("\n──────────────────────────────────────────────");
if (results.length) {
  results.sort((a, b) => a.ms - b.ms);
  console.log("ZERO-INTERVENTION READING IS VIABLE via:", results.map((r) => `${r.name}(${r.ms}ms)`).join(", "));
} else {
  console.log("No public relay is usable from a browser right now — self-hosted gateway remains the only reliable path.");
}
console.log("battery terminé");
