import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { buildTaste, dedupe } from "@/lib/recommend";
import { listTrending, listRecent, listByGenre, listTopRated, GENRES } from "@/lib/anilist";
import { useAsync } from "@/lib/useAsync";
import { composeHome, type Pools } from "@/lib/compose";
import { BlockView } from "@/components/HomeBlocks";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/Skeleton";
import "./Home.css";

const genreId = (name: string) => GENRES.find((g) => g.name === name)?.value;

export function Home() {
  const picks = useStore((s) => s.picks);
  const favorites = useStore((s) => s.favorites);
  const progress = useStore((s) => s.progress);
  const finished = useStore((s) => s.finished);
  const displayName = useStore((s) => s.displayName);

  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);
  const topGenres = taste.topGenres.filter((g) => genreId(g));
  const leadGenre = topGenres[0] ?? "Action";
  const secondGenre = topGenres[1] ?? (leadGenre === "Aventure" ? "Action" : "Aventure");
  const extraGenres = useMemo(() => {
    const base = [...topGenres, "Fantasy", "Romance", "Psychologique", "Action", "Aventure", "Sci-Fi"];
    return [...new Set(base)].filter((g) => genreId(g)).slice(0, 5);
  }, [topGenres]);

  const recA = useAsync(`rec-${genreId(leadGenre)}`, () => listByGenre(genreId(leadGenre)!, 24));
  const recB = useAsync(`rec-${genreId(secondGenre)}`, () => listByGenre(genreId(secondGenre)!, 24));
  const trending = useAsync("trending", () => listTrending(24));
  const recent = useAsync("recent", () => listRecent(20));
  const gems = useAsync("gems", () => listTopRated(24));
  const g0 = useAsync(`hg-${genreId(extraGenres[0] ?? "Action")}`, () => listByGenre(genreId(extraGenres[0] ?? "Action")!, 18));
  const g1 = useAsync(`hg-${genreId(extraGenres[1] ?? "Romance")}`, () => listByGenre(genreId(extraGenres[1] ?? "Romance")!, 18));
  const g2 = useAsync(`hg-${genreId(extraGenres[2] ?? "Fantasy")}`, () => listByGenre(genreId(extraGenres[2] ?? "Fantasy")!, 18));
  const g3 = useAsync(`hg-${genreId(extraGenres[3] ?? "Sci-Fi")}`, () => listByGenre(genreId(extraGenres[3] ?? "Sci-Fi")!, 18));

  const seen = useMemo(
    () => new Set<string>([...picks.map((p) => p.id), ...favorites.map((f) => f.id), ...finished, ...Object.keys(progress)]),
    [picks, favorites, finished, progress],
  );
  const clean = (l?: import("@/lib/types").Manga[]) => (l ? l.filter((m) => !seen.has(m.id)) : []);

  const continueItems = useMemo(
    () => Object.entries(progress).filter(([id]) => !finished.includes(id)).sort((a, b) => b[1].updatedAt - a[1].updatedAt),
    [progress, finished],
  );

  const ready = recA.data || recB.data || trending.data;

  const blocks = useMemo(() => {
    if (!ready) return [];
    const pools: Pools = {
      recommended: dedupe([recA.data ?? [], recB.data ?? []], seen),
      trending: clean(trending.data),
      recent: clean(recent.data),
      gems: clean(gems.data),
      genres: [
        { name: extraGenres[0] ?? "Action", items: clean(g0.data) },
        { name: extraGenres[1] ?? "Romance", items: clean(g1.data) },
        { name: extraGenres[2] ?? "Fantasy", items: clean(g2.data) },
        { name: extraGenres[3] ?? "Sci-Fi", items: clean(g3.data) },
      ].filter((x) => x.items.length >= 4),
      continue: continueItems,
    };
    return composeHome(pools, {
      anchor: picks[0] ?? favorites[0],
      leadGenre,
      justFinished: finished.length > 0 && continueItems.length === 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recA.data, recB.data, trending.data, recent.data, gems.data, g0.data, g1.data, g2.data, g3.data, seen]);

  return (
    <div className="home page">
      <header className="home__bar">
        <Link to="/" aria-label="Tsuku, accueil"><Logo size={26} /></Link>
        <Link to="/profile" className="home__avatar" aria-label="Profil">{(displayName ?? "T").slice(0, 1).toUpperCase()}</Link>
      </header>

      {!ready ? (
        <HomeSkeleton />
      ) : (
        blocks.map((b, i) => <BlockView key={`${b.t}-${i}`} block={b} taste={taste} />)
      )}

      <footer className="home__foot"><Logo size={20} /><p>Ta prochaine lecture, trouvée dans le noir.</p></footer>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div style={{ padding: "var(--s-3) var(--rail-gutter)" }}>
      <Skeleton style={{ aspectRatio: "4 / 5", borderRadius: "var(--r-xl)", marginBottom: "var(--s-6)" }} />
      <div style={{ display: "flex", gap: "var(--s-3)" }}>
        <Skeleton style={{ flex: 1, aspectRatio: "3 / 4.4", borderRadius: "var(--r-lg)" }} />
        <Skeleton style={{ flex: 1, aspectRatio: "3 / 4.4", borderRadius: "var(--r-lg)" }} />
      </div>
    </div>
  );
}
