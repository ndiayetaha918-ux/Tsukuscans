// Build the Tsuku reading library — runs on GitHub Actions (open network).
//
// Why this exists: a browser on our static GitHub Pages site can't call
// MangaDex's API (no CORS) and the public relays are all dead. But page IMAGES
// load via <img> from the STABLE host uploads.mangadex.org with no token or
// CORS (proven by scripts/probe-uploads.mjs). So we pre-fetch, server-side, the
// chapter metadata (content hash + page filenames) for the most popular French
// titles and write it as static JSON. The app then reads that JSON (same-origin
// on Pages) and hotlinks the images — real FR scans, ZERO setup for the user.
//
// Only tiny metadata is stored here; images are hotlinked, never re-hosted.

import { mkdir, writeFile, rm } from "node:fs/promises";

const MD = "https://api.mangadex.org";
const UA = { "User-Agent": "Tsuku-Library/1.0 (+https://github.com/ndiayetaha918-ux/Tsukuscans)" };
const CT = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";
const OUT = "public/library";

// Tunables (kept modest to respect MangaDex rate limits and repo size).
const TITLES = Number(process.env.LIB_TITLES || 60);   // most-followed FR titles
const CH_PER = Number(process.env.LIB_CHAPTERS || 24); // earliest N chapters each
const PAGE = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429) { await sleep(1500 * (i + 1)); continue; }
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(600 * (i + 1));
    }
  }
}

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function topFrManga() {
  const out = [];
  for (let off = 0; out.length < TITLES && off < TITLES * 2; off += PAGE) {
    const url = `${MD}/manga?limit=${PAGE}&offset=${off}&availableTranslatedLanguage[]=fr`
      + `&order[followedCount]=desc&${CT}&includes[]=cover_art`;
    const data = await j(url);
    if (!data.data?.length) break;
    out.push(...data.data);
    await sleep(250);
  }
  return out.slice(0, TITLES);
}

function titlesOf(m) {
  const a = m.attributes;
  const names = new Set();
  const push = (v) => { if (v && typeof v === "string") names.add(v); };
  push(a.title?.en); push(a.title?.ja); push(a.title?.["ja-ro"]); push(a.title?.fr);
  for (const alt of a.altTitles || []) { push(alt.en); push(alt["ja-ro"]); push(alt.fr); push(alt.ja); }
  // also the first value of title whatever the language
  if (a.title) push(Object.values(a.title)[0]);
  return [...names];
}

function coverUrl(m) {
  const rel = (m.relationships || []).find((r) => r.type === "cover_art");
  const file = rel?.attributes?.fileName;
  return file ? `https://uploads.mangadex.org/covers/${m.id}/${file}.256.jpg` : undefined;
}

async function feedChapters(mangaId) {
  const seen = new Set();
  const out = [];
  for (let off = 0; off < 500 && out.length < CH_PER; off += PAGE) {
    const url = `${MD}/manga/${mangaId}/feed?translatedLanguage[]=fr&${CT}`
      + `&order[volume]=asc&order[chapter]=asc&limit=${PAGE}&offset=${off}&includes[]=scanlation_group`;
    const data = await j(url);
    if (!data.data?.length) break;
    for (const c of data.data) {
      const num = c.attributes.chapter ?? "";
      if (!c.attributes.pages) continue;       // skip external / empty chapters
      if (num && seen.has(num)) continue;
      if (num) seen.add(num);
      out.push(c);
      if (out.length >= CH_PER) break;
    }
    if (data.data.length < PAGE) break;
    await sleep(250);
  }
  return out;
}

async function pagesFor(chapterId) {
  const ah = await j(`${MD}/at-home/server/${chapterId}`);
  return { hash: ah.chapter?.hash, files: ah.chapter?.data || [] };
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const mangas = await topFrManga();
  console.log(`Top FR manga fetched: ${mangas.length}`);

  const index = [];        // light cards for matching
  const byAnilist = {};    // anilistId -> mdId  (exact join when available)
  const byTitle = {};      // normalized title -> mdId

  let okTitles = 0, okChapters = 0;
  for (const m of mangas) {
    try {
      const id = m.id;
      const names = titlesOf(m);
      const chapters = await feedChapters(id);
      if (!chapters.length) { console.log(`· skip (no FR chapters): ${names[0]}`); continue; }

      const built = [];
      for (const c of chapters) {
        try {
          const { hash, files } = await pagesFor(c.id);
          if (!hash || !files.length) continue;
          built.push({
            id: c.id,
            chapter: c.attributes.chapter || "—",
            title: c.attributes.title || (c.attributes.chapter ? `Chapitre ${c.attributes.chapter}` : "Oneshot"),
            group: (c.relationships || []).find((r) => r.type === "scanlation_group")?.attributes?.name,
            lang: "fr",
            publishAt: c.attributes.publishAt || "",
            pages: files.length,
            hash,
            files,
          });
          okChapters++;
          await sleep(220);
        } catch (e) {
          console.log(`  ! page fetch failed ch.${c.attributes.chapter}: ${e.message}`);
        }
      }
      if (!built.length) continue;

      await writeFile(`${OUT}/${id}.json`, JSON.stringify({ id, title: names[0], chapters: built }));

      const anilist = m.attributes.links?.al;
      if (anilist) byAnilist[String(anilist)] = id;
      for (const n of names) { const k = norm(n); if (k) byTitle[k] = id; }
      index.push({
        id,
        title: names[0],
        cover: coverUrl(m),
        anilist: anilist ? String(anilist) : undefined,
        chapters: built.length,
        from: built[0].chapter,
        to: built[built.length - 1].chapter,
      });
      okTitles++;
      console.log(`✓ ${names[0]} — ${built.length} ch (al=${anilist || "?"})`);
    } catch (e) {
      console.log(`✗ ${m.id}: ${e.message}`);
    }
  }

  await writeFile(`${OUT}/index.json`, JSON.stringify({
    updatedAt: new Date().toISOString(),
    count: index.length,
    byAnilist,
    byTitle,
    titles: index,
  }));

  console.log(`\nLibrary built: ${okTitles} titles, ${okChapters} chapters → ${OUT}/`);
  if (!okTitles) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
