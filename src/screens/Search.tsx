import { useMemo, useState } from "react";
import { CATALOG, ALL_GENRES } from "@/data/catalog";
import { useStore } from "@/store/useStore";
import { buildProfile, compatibility } from "@/lib/recommend";
import { MangaCard } from "@/components/MangaCard";
import { SearchIcon, CloseIcon } from "@/components/Icons";
import type { Genre } from "@/lib/types";
import "./Search.css";

export function Search() {
  const [q, setQ] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const signal = useStore((s) => s.behaviorSignal());
  const taste = useMemo(() => buildProfile(signal), [signal]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CATALOG.filter((m) => {
      const matchQ =
        !needle ||
        m.title.toLowerCase().includes(needle) ||
        m.author.toLowerCase().includes(needle) ||
        m.tags.some((t) => t.toLowerCase().includes(needle)) ||
        m.genres.some((g) => g.toLowerCase().includes(needle));
      const matchG = genres.length === 0 || genres.every((g) => m.genres.includes(g));
      return matchQ && matchG;
    })
      .map((m) => ({ m, s: compatibility(m, taste) }))
      .sort((a, b) => b.s - a.s);
  }, [q, genres, taste]);

  function toggleGenre(g: Genre) {
    setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  const active = q.trim() || genres.length > 0;

  return (
    <div className="search page">
      <header className="search__head">
        <h1 className="screen-title">Rechercher</h1>
        <div className="search__field">
          <SearchIcon width={18} height={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titre, auteur, thème…"
            aria-label="Rechercher une œuvre"
            autoComplete="off"
          />
          {q && (
            <button className="search__clear" onClick={() => setQ("")} aria-label="Effacer">
              <CloseIcon width={16} height={16} />
            </button>
          )}
        </div>
        <div className="search__genres no-scrollbar">
          {ALL_GENRES.map((g) => (
            <button
              key={g}
              className={`chip${genres.includes(g) ? " chip--active" : ""}`}
              onClick={() => toggleGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </header>

      <p className="search__meta">
        {active ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : "Parcours par compatibilité"}
      </p>

      <div className="search__grid">
        {results.map(({ m, s }) => (
          <MangaCard key={m.id} manga={m} showMeta compat={s} />
        ))}
        {results.length === 0 && (
          <p className="search__none">Rien ne correspond. Essaie un autre thème.</p>
        )}
      </div>
    </div>
  );
}
