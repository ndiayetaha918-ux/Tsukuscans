import { useEffect, useMemo, useState } from "react";
import { searchManga, listPopular, GENRES } from "@/lib/mangadex";
import { useAsync } from "@/lib/useAsync";
import { useStore } from "@/store/useStore";
import { buildTaste, compatibility } from "@/lib/recommend";
import { MangaCard } from "@/components/MangaCard";
import { Skeleton } from "@/components/Skeleton";
import { SearchIcon, CloseIcon } from "@/components/Icons";
import "./Search.css";

export function Search() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const picks = useStore((s) => s.picks);
  const favorites = useStore((s) => s.favorites);
  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const key = debounced ? `search-${debounced}` : "search-popular";
  const { data, loading } = useAsync(key, () => (debounced ? searchManga(debounced, 40) : listPopular(40)));

  const results = useMemo(() => {
    const list = data ?? [];
    const filtered = genres.length ? list.filter((m) => genres.every((g) => m.genres.includes(g))) : list;
    return filtered.map((m) => ({ m, s: compatibility(m, taste) })).sort((a, b) => b.s - a.s);
  }, [data, genres, taste]);

  function toggleGenre(g: string) {
    setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  return (
    <div className="search page">
      <header className="search__head">
        <h1 className="screen-title">Rechercher</h1>
        <div className="search__field">
          <SearchIcon width={18} height={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naruto, One Piece, un thème…" aria-label="Rechercher" autoComplete="off" />
          {q && <button className="search__clear" onClick={() => setQ("")} aria-label="Effacer"><CloseIcon width={16} height={16} /></button>}
        </div>
        <div className="search__genres no-scrollbar">
          {GENRES.map((g) => (
            <button key={g.id} className={`chip${genres.includes(g.name) ? " chip--active" : ""}`} onClick={() => toggleGenre(g.name)}>{g.name}</button>
          ))}
        </div>
      </header>

      <p className="search__meta">
        {debounced ? (loading ? "Recherche…" : `${results.length} résultat${results.length > 1 ? "s" : ""}`) : "Les plus populaires"}
      </p>

      <div className="search__grid">
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} style={{ aspectRatio: "2 / 3", borderRadius: "var(--r-md)" }} />)
        ) : results.length === 0 ? (
          <p className="search__none">Rien ne correspond. Essaie un autre titre ou thème.</p>
        ) : (
          results.map(({ m, s }) => <MangaCard key={m.id} manga={m} compat={s} />)
        )}
      </div>
    </div>
  );
}
