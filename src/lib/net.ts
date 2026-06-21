import { useStore } from "@/store/useStore";

/* Central routing for reading-source requests.

   Ground truth (proven by CI, scripts/probe-cors.mjs + probe-proxies.mjs against
   real MangaDex):
   - MangaDex's JSON API sends NO Access-Control-Allow-Origin header, so a browser
     on our static site CANNOT call it directly — it's blocked by CORS.
   - Every public CORS proxy we tested is currently dead or blocking
     (allorigins 522 after a 20s hang, corsproxy 403, codetabs 400, thingproxy
     down). Leaning on them just produces long hangs that never succeed.
   - Page IMAGES, by contrast, load fine directly via <img> (CORS is irrelevant
     for images), so they never need a proxy unless the user's own network blocks
     MangaDex entirely.

   Conclusion: reliable reading needs a tiny deployed gateway (gateway/worker.mjs,
   free, ~2 min). When one is configured we route JSON through it. When none is
   set we fail FAST with NoGatewayError so the reader can guide the user to set
   one up — never an infinite spinner, never a false promise. */

/** Built-in gateway: the whole FR catalogue works for every user with NOTHING
 *  to paste or deploy. Users can still override it with their own in Profil. */
export const DEFAULT_GATEWAY = "https://rocky-vicuna-3084.ndiayetaha918-ux.deno.net";

const gw = () => (useStore.getState().gatewayUrl || DEFAULT_GATEWAY).replace(/\/+$/, "");

export const hasGateway = () => !!gw();

/** Thrown when a reading request is made with no gateway at all (shouldn't
 *  happen now that one is built in, but kept for safety). */
export class NoGatewayError extends Error {
  constructor() {
    super("NO_GATEWAY");
    this.name = "NoGatewayError";
  }
}

export const mdUrl = (path: string) => `${gw()}/md/${path}`;
export const ckUrl = (path: string) => `${gw()}/ck/${path}`;

/** Page image URL — always DIRECT. Images load via <img>, which ignores CORS, so
 *  they never need the gateway; keeping them direct protects the gateway's
 *  bandwidth (it only ever proxies tiny JSON). */
export const imgUrl = (u: string) => u;

async function fetchJSON<T>(url: string, timeout = 9000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resilient JSON GET through the gateway. `gatewayUrl` is the full gateway URL
 *  (built via mdUrl/ckUrl). Throws NoGatewayError fast when no gateway is set. */
export async function getJSON<T>(gatewayUrl: string): Promise<T> {
  if (!hasGateway()) throw new NoGatewayError();
  let lastErr: unknown;
  for (let a = 0; a < 3; a++) {
    try {
      return await fetchJSON<T>(gatewayUrl);
    } catch (e) {
      lastErr = e;
      if (a < 2) await delay(400 * (a + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("gateway indisponible");
}
