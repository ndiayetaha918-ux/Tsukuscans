import { useStore } from "@/store/useStore";

/* Central routing for source requests. When a reading gateway is configured,
   everything goes through it (server-side fetch, CORS-open, unblockable). When
   not, we fall back to direct + public CORS proxies (best-effort). */

const gw = () => useStore.getState().gatewayUrl;

export const hasGateway = () => !!gw();

export const mdUrl = (path: string) => {
  const g = gw();
  return g ? `${g}/md/${path}` : `https://api.mangadex.org/${path}`;
};

export const ckUrl = (path: string) => {
  const g = gw();
  return g ? `${g}/ck/${path}` : `https://api.comick.fun/${path}`;
};

/** Page image URL — proxied through the gateway so it's reachable + CORS-clean. */
export const imgUrl = (u: string) => {
  const g = gw();
  return g ? `${g}/img?u=${encodeURIComponent(u)}` : u;
};

export const PUBLIC_PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

export async function fetchJSON<T>(url: string, timeout = 7000): Promise<T> {
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

/** Resilient JSON GET. `gatewayPath` is the path on the gateway/source; `directRaw`
 *  is the absolute source URL used for public-proxy fallback when no gateway. */
export async function getJSON<T>(gatewayPath: string, directRaw: string): Promise<T> {
  let lastErr: unknown;
  for (let a = 0; a < 2; a++) {
    try { return await fetchJSON<T>(gatewayPath); }
    catch (e) { lastErr = e; if (a === 0) await delay(300); }
  }
  if (!hasGateway()) {
    for (const proxy of PUBLIC_PROXIES) {
      try { return await fetchJSON<T>(proxy(directRaw)); } catch (e) { lastErr = e; }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("source indisponible");
}
