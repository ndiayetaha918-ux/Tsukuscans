import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { buildTaste, compatibility, dedupe } from "@/lib/recommend";
import { listTrending, listByGenre, GENRES } from "@/lib/anilist";
import { Cover } from "@/components/Cover";
import { HeartIcon, PlayIcon, PlusIcon, CheckIcon, ChevronDown } from "@/components/Icons";
import type { Manga } from "@/lib/types";
import "./Discover.css";

const genreId = (name: string) => GENRES.find((g) => g.name === name)?.value;

export function Discover() {
  const picks = useStore((s) => s.picks);
  const favorites = useStore((s) => s.favorites);
  const finished = useStore((s) => s.finished);
  const progress = useStore((s) => s.progress);
  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);
  const leadId = genreId(taste.topGenres.find((g) => genreId(g)) ?? "Action")!;

  const seen = useMemo(
    () => new Set<string>([...picks.map((p) => p.id), ...favorites.map((f) => f.id), ...finished, ...Object.keys(progress)]),
    [picks, favorites, finished, progress],
  );

  const [items, setItems] = useState<Manga[]>([]);
  const [done, setDone] = useState(false);
  const [errored, setErrored] = useState(false);
  const pageNum = useRef(1);
  const loading = useRef(false);
  const loadedIds = useRef(new Set<string>());
  const feedRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading.current || done) return;
    loading.current = true;
    try {
      const p = pageNum.current;
      const [a, b] = await Promise.all([
        listTrending(20, p).catch(() => [] as Manga[]),
        listByGenre(leadId, 20, p).catch(() => [] as Manga[]),
      ]);
      if (a.length === 0 && b.length === 0) {
        if (items.length === 0) setErrored(true);
        setDone(true);
        return;
      }
      const batch = dedupe([a, b]).filter((m) => !seen.has(m.id) && !loadedIds.current.has(m.id));
      batch.forEach((m) => loadedIds.current.add(m.id));
      const ordered = batch
        .map((m) => ({ m, k: compatibility(m, taste) + Math.random() * 26 }))
        .sort((x, y) => y.k - x.k)
        .map((x) => x.m);
      setItems((prev) => [...prev, ...ordered]);
      pageNum.current = p + 1;
    } finally {
      loading.current = false;
    }
  }, [done, leadId, seen, taste, items.length]);

  useEffect(() => { if (items.length === 0) loadMore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: feedRef.current, rootMargin: "1200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (errored && items.length === 0) {
    return (
      <div className="feed feed--msg">
        <p>La découverte n'a pas pu se charger.</p>
        <button className="btn btn--primary" onClick={() => { setErrored(false); setDone(false); loadMore(); }}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="feed" aria-label="Feed de découverte" ref={feedRef}>
      {items.map((m, i) => (
        <FeedCard key={m.id} manga={m} first={i === 0} />
      ))}
      <div ref={sentinelRef} className="feed__sentinel" aria-hidden="true" />
      {items.length === 0 && <div className="fcard feed__loadcard"><span className="feed__spinner" /></div>}
    </div>
  );
}

function FeedCard({ manga, first }: { manga: Manga; first: boolean }) {
  const isFavorite = useStore((s) => s.isFavorite);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const fav = isFavorite(manga.id);
  const ctx = manga.color ? ({ ["--ctx" as string]: manga.color } as React.CSSProperties) : undefined;

  return (
    <section className="fcard" aria-label={manga.title} style={ctx}>
      <div className="fcard__bg"><Cover manga={manga} shape="hero" /></div>
      <div className="fcard__scrim" />

      <div className="fcard__side">
        <button className={`fcard__act${fav ? " is-on" : ""}`} onClick={() => toggleFavorite(manga)} aria-label={fav ? "Retirer" : "J'aime"}>
          <HeartIcon /><span>{fav ? "Aimé" : "J'aime"}</span>
        </button>
      </div>

      <div className="fcard__body">
        <div className="fcard__genres">
          {manga.genres.slice(0, 3).map((g) => <span key={g} className="fcard__genre">{g}</span>)}
        </div>
        <Link to={`/title/${manga.id}`} className="fcard__title">{manga.title}</Link>
        {manga.synopsis && <p className="fcard__syn">{clamp(manga.synopsis, 160)}</p>}
        <div className="fcard__cta">
          <Link to={`/title/${manga.id}`} className="btn btn--solid"><PlayIcon width={18} height={18} /> Découvrir</Link>
          <button className={`btn btn--ghost${fav ? " is-on" : ""}`} onClick={() => toggleFavorite(manga)}>
            {fav ? <CheckIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}{fav ? "Dans ma liste" : "Ma liste"}
          </button>
        </div>
      </div>

      {first && <div className="fcard__hint" aria-hidden="true"><ChevronDown /><span>Glisse pour découvrir</span></div>}
    </section>
  );
}

function clamp(s: string, n: number) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}
