import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { buildTaste, compatibility, dedupe } from "@/lib/recommend";
import { listPopular, listByGenre, GENRES } from "@/lib/mangadex";
import { useAsync } from "@/lib/useAsync";
import { Cover } from "@/components/Cover";
import { CompatRing } from "@/components/CompatRing";
import { Skeleton } from "@/components/Skeleton";
import { HeartIcon, PlayIcon, PlusIcon, CheckIcon, ChevronDown } from "@/components/Icons";
import type { Manga } from "@/lib/types";
import "./Discover.css";

const genreId = (name: string) => GENRES.find((g) => g.name === name)?.id;

export function Discover() {
  const picks = useStore((s) => s.picks);
  const favorites = useStore((s) => s.favorites);
  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);
  const leadId = genreId(taste.topGenres.find((g) => genreId(g)) ?? "Action")!;

  const popular = useAsync("feed-popular", () => listPopular(40));
  const genre = useAsync(`feed-${leadId}`, () => listByGenre(leadId, 30));

  const feed = useMemo(() => {
    if (!popular.data && !genre.data) return undefined;
    const merged = dedupe([genre.data ?? [], popular.data ?? []]);
    // weighted shuffle: compatibility decides odds, randomness keeps it alive
    return merged
      .map((m) => ({ m, k: compatibility(m, taste) + Math.random() * 28 }))
      .sort((a, b) => b.k - a.k)
      .map((x) => x.m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popular.data, genre.data]);

  if (!feed) {
    return (
      <div className="feed feed--loading">
        <div className="fcard"><Skeleton style={{ position: "absolute", inset: 0, borderRadius: 0 }} /></div>
      </div>
    );
  }

  return (
    <div className="feed" aria-label="Feed de découverte">
      {feed.map((m, i) => (
        <FeedCard key={m.id} manga={m} score={compatibility(m, taste)} first={i === 0} />
      ))}
    </div>
  );
}

function FeedCard({ manga, score, first }: { manga: Manga; score: number; first: boolean }) {
  const isFavorite = useStore((s) => s.isFavorite);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const fav = isFavorite(manga.id);

  return (
    <section className="fcard" aria-label={manga.title}>
      <div className="fcard__bg"><Cover manga={manga} shape="hero" /></div>
      <div className="fcard__scrim" />

      <div className="fcard__side">
        <button className={`fcard__act${fav ? " is-on" : ""}`} onClick={() => toggleFavorite(manga)} aria-label={fav ? "Retirer" : "J'aime"}>
          <HeartIcon /><span>{fav ? "Aimé" : "J'aime"}</span>
        </button>
        <div className="fcard__act"><CompatRing score={score} size={50} /><span>match</span></div>
      </div>

      <div className="fcard__body">
        <div className="fcard__genres">
          {manga.genres.slice(0, 3).map((g) => <span key={g} className="fcard__genre">{g}</span>)}
        </div>
        <Link to={`/title/${manga.id}`} className="fcard__title">{manga.title}</Link>
        {manga.synopsis && <p className="fcard__syn">{clamp(manga.synopsis, 160)}</p>}
        <div className="fcard__cta">
          <Link to={`/reader/${manga.id}`} className="btn btn--solid"><PlayIcon width={18} height={18} /> Commencer</Link>
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
