/* Tsuku reading gateway.
   A tiny, portable proxy (Cloudflare Workers / Deno Deploy / Node) that runs
   on an OPEN network — so it fetches real MangaDex/Comick scans server-side and
   serves them to the browser with CORS. This is what makes reading work when a
   user's own network blocks the sources.

   Routes:
     GET /                           → health check
     GET /md/<path><query>           → proxy https://api.mangadex.org/<path>
     GET /ck/<path><query>           → proxy https://api.comick.fun/<path>
     GET /img?u=<url>                → proxy a page image (allowlisted hosts), with cache
     GET /unlock?url=<url>           → Bright Data Web Unlocker (residential IP bypass)
     GET /as/chapters?slug=<slug>    → anime-sama chapter list for a manga slug
     GET /as/pages?url=<url>         → anime-sama chapter page image list
*/

const MD = "https://api.mangadex.org";
const CK = "https://api.comick.fun";
const IMG_HOSTS = [/\.mangadex\.network$/, /^uploads\.mangadex\.org$/, /^meo\.comick\.pictures$/, /\.comick\.pictures$/, /^neko-sama\.fr$/, /anime-sama\.(fr|to)$/, /raw\.githubusercontent\.com$/];
const UA = "Tsuku-Gateway/1.0 (+https://github.com/ndiayetaha918-ux/Tsukuscans)";
const BR_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "*",
};

// Bright Data Web Unlocker credentials — set BD_TOKEN and BD_ZONE as env vars
// in your Deno Deploy project dashboard (Settings → Environment Variables).
function bdToken() {
  return (typeof Deno !== "undefined" ? Deno.env.get("BD_TOKEN") : process.env?.BD_TOKEN) || "";
}
function bdZone() {
  return (typeof Deno !== "undefined" ? Deno.env.get("BD_ZONE") : process.env?.BD_ZONE) || "unblocker";
}

async function unlockUrl(targetUrl) {
  const token = bdToken();
  if (!token) throw new Error("BD_TOKEN not configured");
  const r = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ zone: bdZone(), url: targetUrl, format: "raw" }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) {
    const msg = await r.text();
    throw new Error(`BD ${r.status}: ${msg.slice(0, 200)}`);
  }
  return r;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}

async function proxyJson(target) {
  const r = await fetch(target, { headers: { "User-Agent": UA, Accept: "application/json" } });
  const body = await r.text();
  return new Response(body, { status: r.status, headers: { ...CORS, "content-type": "application/json" } });
}

export async function handle(req) {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const p = url.pathname;
  try {
    if (p === "/" || p === "") return json({ ok: true, service: "tsuku-gateway" });
    if (p.startsWith("/md/")) return await proxyJson(`${MD}/${p.slice(4)}${url.search}`);
    if (p.startsWith("/ck/")) return await proxyJson(`${CK}/${p.slice(4)}${url.search}`);
    if (p === "/img") {
      const u = url.searchParams.get("u");
      if (!u) return json({ error: "missing u" }, 400);
      let host;
      try { host = new URL(u).hostname; } catch { return json({ error: "bad url" }, 400); }
      if (!IMG_HOSTS.some((re) => re.test(host))) return json({ error: "host not allowed", host }, 403);
      const r = await fetch(u, { headers: { "User-Agent": UA, Referer: "https://mangadex.org/" } });
      const buf = await r.arrayBuffer();
      return new Response(buf, {
        status: r.status,
        headers: { ...CORS, "content-type": r.headers.get("content-type") || "image/jpeg", "cache-control": "public, max-age=604800" },
      });
    }

    // ── Bright Data Web Unlocker routes ────────────────────────────────────
    if (p === "/unlock") {
      const u = url.searchParams.get("url");
      if (!u) return json({ error: "missing url" }, 400);
      if (!bdToken()) return json({ error: "BD_TOKEN not configured", hint: "Set BD_TOKEN env var in Deno Deploy dashboard" }, 503);
      const r = await unlockUrl(u);
      const ct = r.headers.get("content-type") || "text/html";
      const buf = await r.arrayBuffer();
      return new Response(buf, { status: r.status, headers: { ...CORS, "content-type": ct } });
    }

    // ── anime-sama chapter list ────────────────────────────────────────────
    if (p === "/as/chapters") {
      const slug = url.searchParams.get("slug");
      if (!slug) return json({ error: "missing slug" }, 400);
      if (!bdToken()) return json({ error: "BD_TOKEN not configured" }, 503);
      const targetUrl = `https://anime-sama.to/catalogue/${slug}/scan/fr/`;
      const r = await unlockUrl(targetUrl);
      const html = await r.text();
      const chapters = parseAnimeSamaChapters(html, targetUrl);
      return json({ slug, chapters, source: "anime-sama" });
    }

    // ── anime-sama page images for a given chapter URL ─────────────────────
    if (p === "/as/pages") {
      const chUrl = url.searchParams.get("url");
      if (!chUrl) return json({ error: "missing url" }, 400);
      if (!bdToken()) return json({ error: "BD_TOKEN not configured" }, 503);
      const r = await unlockUrl(chUrl);
      const html = await r.text();
      const pages = parseAnimeSamaPages(html);
      return json({ url: chUrl, pages, source: "anime-sama" });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 502);
  }
}

// ── anime-sama HTML parsers ────────────────────────────────────────────────

// Extract chapter list from the anime-sama catalogue page.
// The page contains a <script> block with panneauScan = { "1": "url", ... }
// OR a list of <a href="..."> links pointing to episode/chapter pages.
function parseAnimeSamaChapters(html, baseUrl) {
  const chapters = [];

  // Try panneauScan JS variable first (most reliable)
  const panneauMatch = html.match(/panneauScan\s*=\s*(\{[\s\S]*?\});/);
  if (panneauMatch) {
    try {
      const raw = panneauMatch[1].replace(/'/g, '"');
      const obj = JSON.parse(raw);
      for (const [num, path] of Object.entries(obj)) {
        const href = path.startsWith("http") ? path : new URL(path, baseUrl).href;
        chapters.push({ chapter: String(num), url: href });
      }
      return chapters.sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));
    } catch { /* fall through */ }
  }

  // Fallback: find links matching chapter pattern
  const linkRe = /href="([^"]*\/(?:chapitre|chapter|ep)[^"]*\/?)"/gi;
  let m;
  const seen = new Set();
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].startsWith("http") ? m[1] : new URL(m[1], baseUrl).href;
    if (!seen.has(href)) { seen.add(href); chapters.push({ chapter: String(chapters.length + 1), url: href }); }
  }
  return chapters;
}

// Extract image URLs from an anime-sama chapter reader page.
// The reader has a JS array: var listImagesPage = ["url1","url2",...];
function parseAnimeSamaPages(html) {
  // Primary: listImagesPage JS variable
  const m = html.match(/(?:var\s+)?listImagesPage\s*=\s*(\[[\s\S]*?\])/);
  if (m) {
    try { return JSON.parse(m[1].replace(/'/g, '"')); } catch { /* fall through */ }
  }
  // Secondary: images inside .manga_img or direct src attributes
  const imgs = [];
  const imgRe = /src="(https?:\/\/[^"]*\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi;
  let r;
  while ((r = imgRe.exec(html)) !== null) {
    const u = r[1];
    if (!u.includes("logo") && !u.includes("banner") && !u.includes("icon")) imgs.push(u);
  }
  return [...new Set(imgs)];
}

// Cloudflare Workers / Deno Deploy entry point
export default { fetch: handle };

// Deno Deploy also supports the top-level serve form:
if (typeof Deno !== "undefined" && Deno.serve) Deno.serve(handle);
