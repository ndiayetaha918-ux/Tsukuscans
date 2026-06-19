import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { buildProfile, buildDiscoveryFeed, compatibility } from "@/lib/recommend";
import type { Manga } from "@/lib/types";
import { CoverArt } from "@/components/CoverArt";
import { CompatRing } from "@/components/CompatRing";
import { HeartIcon, PlayIcon, PlusIcon, CheckIcon, ChevronDown } from "@/components/Icons";
import "./Discover.css";

export function Discover() {
  const signal = useStore((s) => s.behaviorSignal());
  const taste = useMemo(() => buildProfile(signal), [signal]);
  // Re-seed once per mount so the feed feels alive without reshuffling mid-scroll.
  const feed = useMemo(() => buildDiscoveryFeed(signal, taste), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="feed" aria-label="Feed de découverte">
      {feed.map((m, i) => (
        <FeedCard key={m.id} manga={m} score={compatibility(m, taste)} index={i} />
      ))}
    </div>
  );
}

function FeedCard({ manga, score, index }: { manga: Manga; score: number; index: number }) {
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = favorites.includes(manga.id);

  return (
    <section className="fcard" aria-label={manga.title}>
      <div className="fcard__bg">
        <CoverArt manga={manga} variant="feed" />
        <div className="fcard__scrim" />
      </div>

      <div className="fcard__side">
        <button
          className={`fcard__act${isFav ? " is-on" : ""}`}
          onClick={() => toggleFavorite(manga.id)}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <HeartIcon />
          <span>{isFav ? "Aimé" : "J'aime"}</span>
        </button>
        <div className="fcard__act fcard__act--ring">
          <CompatRing score={score} size={50} />
          <span>match</span>
        </div>
      </div>

      <div className="fcard__body">
        <div className="fcard__genres">
          {manga.genres.slice(0, 3).map((g) => (
            <span key={g} className="fcard__genre">{g}</span>
          ))}
        </div>
        <Link to={`/title/${manga.id}`} className="fcard__title">{manga.title}</Link>
        <p className="fcard__syn">{manga.synopsis}</p>
        <div className="fcard__cta">
          <Link to={`/reader/${manga.id}`} className="btn btn--solid">
            <PlayIcon width={18} height={18} /> Commencer
          </Link>
          <AddBtn id={manga.id} />
        </div>
      </div>

      {index === 0 && (
        <div className="fcard__hint" aria-hidden="true">
          <ChevronDown /> <span>Glisse pour découvrir</span>
        </div>
      )}
    </section>
  );
}

function AddBtn({ id }: { id: string }) {
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const on = favorites.includes(id);
  return (
    <button className={`btn btn--ghost${on ? " is-on" : ""}`} onClick={() => toggleFavorite(id)}>
      {on ? <CheckIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}
      {on ? "Dans ma liste" : "Ma liste"}
    </button>
  );
}
