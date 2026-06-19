import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { getManga } from "@/data/catalog";
import { MangaCard } from "@/components/MangaCard";
import { LibraryIcon, DownloadIcon, PlayIcon, HeartIcon, CheckIcon } from "@/components/Icons";
import "./Library.css";

type Tab = "favorites" | "reading" | "downloads" | "finished";

export function Library() {
  const favorites = useStore((s) => s.favorites);
  const finished = useStore((s) => s.finished);
  const progress = useStore((s) => s.progress);
  const downloads = useStore((s) => s.downloads);
  const [tab, setTab] = useState<Tab>("favorites");

  const tabs = useMemo(
    () => ({
      favorites: { label: "Favoris", icon: <HeartIcon width={16} height={16} />, ids: favorites },
      reading: {
        label: "En cours",
        icon: <PlayIcon width={15} height={15} />,
        ids: Object.keys(progress).filter((id) => !finished.includes(id)),
      },
      downloads: {
        label: "Hors-ligne",
        icon: <DownloadIcon width={16} height={16} />,
        ids: Object.keys(downloads),
      },
      finished: { label: "Terminés", icon: <CheckIcon width={16} height={16} />, ids: finished },
    }),
    [favorites, finished, progress, downloads],
  );

  const items = tabs[tab].ids.map((id) => getManga(id)).filter(Boolean);

  return (
    <div className="library page">
      <header className="screen-head">
        <h1 className="screen-title">Ma bibliothèque</h1>
      </header>

      <div className="lib__tabs no-scrollbar">
        {(Object.keys(tabs) as Tab[]).map((t) => (
          <button
            key={t}
            className={`chip${tab === t ? " chip--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {tabs[t].icon} {tabs[t].label}
            <span className="lib__count">{tabs[t].ids.length}</span>
          </button>
        ))}
      </div>

      {items.length > 0 ? (
        <div className="lib__grid">
          {items.map((m) => {
            const dlCount = downloads[m!.id]?.length;
            return (
              <div key={m!.id} className="lib__cell">
                <MangaCard manga={m!} />
                {tab === "downloads" && dlCount && (
                  <span className="lib__dlbadge"><DownloadIcon width={12} height={12} /> {dlCount} ch.</span>
                )}
                {tab === "reading" && progress[m!.id] && (
                  <Link to={`/reader/${m!.id}`} className="lib__resume">
                    Ch. {progress[m!.id].chapterNumber} · p.{progress[m!.id].page + 1}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState tab={tab} />
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const copy: Record<Tab, { title: string; body: string }> = {
    favorites: { title: "Ta liste est vide", body: "Touche le cœur sur une œuvre pour la garder à portée de main." },
    reading: { title: "Aucune lecture en cours", body: "Ouvre un titre : ta position exacte sera mémorisée ici." },
    downloads: { title: "Rien hors-ligne", body: "Télécharge un chapitre ou un tome pour lire sans connexion." },
    finished: { title: "Pas encore de fin", body: "Les œuvres terminées atterrissent ici, comme un trophée discret." },
  };
  return (
    <div className="lib__empty panel">
      <span className="lib__emptyicon"><LibraryIcon /></span>
      <h2>{copy[tab].title}</h2>
      <p>{copy[tab].body}</p>
      <Link to="/discover" className="btn btn--primary">Découvrir des œuvres</Link>
    </div>
  );
}
