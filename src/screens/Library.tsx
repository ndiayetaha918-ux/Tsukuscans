import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { MangaCard } from "@/components/MangaCard";
import { Cover } from "@/components/Cover";
import { LibraryIcon, PlayIcon, HeartIcon } from "@/components/Icons";
import type { Manga, TasteSeed } from "@/lib/types";
import "./Library.css";

type Tab = "favorites" | "reading";

function seedToManga(s: TasteSeed): Manga {
  return { id: s.id, title: s.title, author: "", status: "", genres: s.genres, tags: s.tags, synopsis: "", coverThumb: s.coverThumb, coverUrl: s.coverThumb };
}

export function Library() {
  const favorites = useStore((s) => s.favorites);
  const progress = useStore((s) => s.progress);
  const finished = useStore((s) => s.finished);
  const [tab, setTab] = useState<Tab>("favorites");

  const reading = useMemo(
    () => Object.entries(progress).filter(([id]) => !finished.includes(id)).sort((a, b) => b[1].updatedAt - a[1].updatedAt),
    [progress, finished],
  );

  const tabs = {
    favorites: { label: "Favoris", icon: <HeartIcon width={16} height={16} />, count: favorites.length },
    reading: { label: "En cours", icon: <PlayIcon width={15} height={15} />, count: reading.length },
  };

  return (
    <div className="library page">
      <header className="screen-head"><h1 className="screen-title">Ma bibliothèque</h1></header>

      <div className="lib__tabs no-scrollbar">
        {(Object.keys(tabs) as Tab[]).map((t) => (
          <button key={t} className={`chip${tab === t ? " chip--active" : ""}`} onClick={() => setTab(t)}>
            {tabs[t].icon} {tabs[t].label}<span className="lib__count">{tabs[t].count}</span>
          </button>
        ))}
      </div>

      {tab === "favorites" ? (
        favorites.length ? (
          <div className="lib__grid">{favorites.map((s) => <MangaCard key={s.id} manga={seedToManga(s)} />)}</div>
        ) : (
          <Empty title="Ta liste est vide" body="Touche le cœur sur une œuvre pour la garder à portée de main." />
        )
      ) : reading.length ? (
        <div className="lib__grid">
          {reading.map(([id, p]) => (
            <div key={id} className="lib__cell">
              <Link to={`/reader/${id}`} className="mcard">
                <div className="mcard__poster">
                  <Cover manga={seedToManga({ id, title: p.title, coverThumb: p.coverThumb, genres: [], tags: [] })} shape="thumb" />
                  <span className="lib__resumebadge"><PlayIcon width={14} height={14} /> Ch. {p.chapter}</span>
                </div>
                <div className="mcard__meta"><span className="mcard__title">{p.title}</span><span className="mcard__genre">page {p.page + 1}</span></div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Aucune lecture en cours" body="Ouvre un titre : ta position exacte sera mémorisée ici." />
      )}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="lib__empty panel">
      <span className="lib__emptyicon"><LibraryIcon /></span>
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to="/discover" className="btn btn--primary">Découvrir des œuvres</Link>
    </div>
  );
}
