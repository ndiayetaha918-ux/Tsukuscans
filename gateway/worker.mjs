/* Tsuku reading gateway.
   A tiny, portable proxy (Cloudflare Workers / Deno Deploy / Node) that runs
   on an OPEN network — so it fetches real MangaDex/Comick scans server-side and
   serves them to the browser with CORS. This is what makes reading work when a
   user's own network blocks the sources.

   Routes:
     GET /                  → health check
     GET /md/<path><query>  → proxy https://api.mangadex.org/<path>
     GET /ck/<path><query>  → proxy https://api.comick.fun/<path>
     GET /img?u=<url>       → proxy a page image (allowlisted hosts), with cache
*/

const MD = "https://api.mangadex.org";
const CK = "https://api.comick.fun";
const IMG_HOSTS = [/\.mangadex\.network$/, /^uploads\.mangadex\.org$/, /^meo\.comick\.pictures$/, /\.comick\.pictures$/];
const UA = "Tsuku-Gateway/1.0 (+https://github.com/ndiayetaha918-ux/Tsukuscans)";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "*",
};

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
    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 502);
  }
}

// Cloudflare Workers / Deno Deploy entry point
export default { fetch: handle };

// Deno Deploy also supports the top-level serve form:
if (typeof Deno !== "undefined" && Deno.serve) Deno.serve(handle);
