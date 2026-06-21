// Runs the gateway handler against the REAL MangaDex on CI (open network) and
// asserts the whole reading path works through it, CORS included. Exits non-zero
// on failure — this is proof, not a promise.
import { handle } from "./worker.mjs";

const get = (path) => handle(new Request("http://gw" + path));
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

let r = await get("/");
console.log("health:", r.status, await r.json());

r = await get("/md/manga?title=Chainsaw%20Man&limit=1&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica");
ok(r.headers.get("access-control-allow-origin") === "*", "CORS missing on /md");
const s = await r.json();
const id = s.data[0].id;
console.log("manga:", id);

r = await get(`/md/manga/${id}/feed?translatedLanguage[]=fr&order[chapter]=asc&limit=1&includes[]=scanlation_group`);
const f = await r.json();
ok(f.data.length > 0, "no FR chapter via gateway");
const ch = f.data[0].id;
const group = f.data[0].relationships.find((x) => x.type === "scanlation_group")?.attributes?.name;
console.log("FR chapter:", f.data[0].attributes.chapter, "by", group, "· total", f.total);

r = await get(`/md/at-home/server/${ch}`);
const ah = await r.json();
const pageUrl = `${ah.baseUrl}/data/${ah.chapter.hash}/${ah.chapter.data[0]}`;
console.log("pages:", ah.chapter.data.length);

r = await get(`/img?u=${encodeURIComponent(pageUrl)}`);
const buf = await r.arrayBuffer();
console.log("image via gateway:", r.status, r.headers.get("content-type"), "CORS", r.headers.get("access-control-allow-origin"), (buf.byteLength / 1024 | 0) + "KB");
ok(r.status === 200 && buf.byteLength > 8000, "image proxy failed");

console.log("\n✅ GATEWAY TEST OK — real FR scan readable through the gateway");
