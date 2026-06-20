import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { buildTaste, compatibility, dedupe } from "@/lib/recommend";
import { listTrending, listRecent, listByGenre, listTopRated, GENRES } from "@/lib/anilist";
import { useAsync } from "@/lib/useAsync";
import { Rail } from "@/components/Rail";
import { Cover } from "@/components/Cover";
import { CompatRing } from "@/components/CompatRing";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/Skeleton";
import { PlayIcon, PlusIcon, CheckIcon } from "@/components/Icons";
import type { Manga } from "@/lib/types";
import "./Home.css";

const genreId = (name: string) => GENRES.find((g) => g.name === name)?.value;

export function Home() {
  const picks = useStore((s) => s.picks);
  const favorites = useStore((s) => s.favorites);
  const progress = useStore((s) => s.progress);
  const finished = useStore((s) => s.finished);
  const displayName = useStore((s) => s.displayName);
  const isFavorite = useStore((s) => s.isFavorite);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);

  // Everything the user already chose / is reading is excluded from discovery.
  const seen = useMemo(
    () => new Set<string>([...picks.map((p) => p.id), ...favorites.map((f) => f.id), ...finished, ...Object.keys(progress)]),
    [picks, favorites, finished, progress],
  );

  const topGenres = taste.topGenres.filter((g) => genreId(g));
  const leadGenre = topGenres[0] ?? "Action";
  const secondGenre = topGenres[1] ?? (leadGenre === "Aventure" ? "Action" : "Aventure");

  const recA = useAsync(`rec-${genreId(leadGenre)}`, () => listByGenre(genreId(leadGenre)!, 24));
  const recB = useAsync(`rec-${genreId(secondGenre)}`, () => listByGenre(genreId(secondGenre)!, 24));
  const trending = useAsync("trending", () => listTrending(22));
  const recent = useAsync("recent", () => listRecent(20));
  const gems = useAsync("gems", () => listTopRated(22));

  // Recommended = blend of the two lead genres, seen filtered out, weighted-
  // shuffled by compatibility so it varies between visits.
  const recommended = useMemo(() => {
    if (!recA.data && !recB.data) return undefined;
    const merged = dedupe([recA.data ?? [], recB.data ?? []], seen);
    return merged
      .map((m) => ({ m, k: compatibility(m, taste) + Math.random() * 22 }))
      .sort((a, b) => b.k - a.k)
      .map((x) => x.m)
      .slice(0, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recA.data, recB.data, seen]);

  const clean = (list?: Manga[]) => (list ? list.filter((m) => !seen.has(m.id)) : list);

  const anchor = picks[0] ?? favorites[0];
  const anchorGenre = anchor?.genres?.find((g) => genreId(g));
  const because = useAsync(anchorGenre ? `because-${genreId(anchorGenre)}` : null, () => listByGenre(genreId(anchorGenre!)!, 20));

  const hero = useMemo(() => {
    const pool = recommended ?? trending.data ?? [];
    if (!pool.length) return undefined;
    return pool[Math.floor(Math.random() * Math.min(3, pool.length))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommended, trending.data]);

  const otherGenres = useMemo(() => {
    const base = [...topGenres, "Fantasy", "Romance", "Psychologique", "Action", "Aventure"];
    return [...new Set(base)].filter((g) => genreId(g) && g !== leadGenre && g !== secondGenre).slice(0, 4);
  }, [topGenres, leadGenre, secondGenre]);

  const continueItems = useMemo(
    () => Object.entries(progress).filter(([id]) => !finished.includes(id)).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, 8),
    [progress, finished],
  );

  return (
    <div className="home page">
      <header className="home__bar">
        <Link to="/" aria-label="Tsuki, accueil"><Logo size={26} /></Link>
        <Link to="/profile" className="home__avatar" aria-label="Profil">{(displayName ?? "T").slice(0, 1).toUpperCase()}</Link>
      </header>

      {hero ? <Hero manga={hero} taste={taste} fav={isFavorite(hero.id)} onFav={() => toggleFavorite(hero)} /> : <HeroSkeleton />}

      {continueItems.length > 0 && (
        <section className="rail continue">
          <header className="rail__head"><h2 className="rail__title">{greet()}{displayName ? `, ${displayName}` : ""} — on reprend ?</h2></header>
          <div className="rail__track no-scrollbar">
            {continueItems.map(([id, p]) => (
              <Link to={`/reader/${id}`} key={id} className="cont">
                <div className="cont__poster">
                  <Cover manga={{ id, title: p.title, author: "", status: "", genres: [], tags: [], synopsis: "", coverThumb: p.coverThumb, coverUrl: p.coverThumb } as Manga} shape="thumb" />
                  <span className="cont__play"><PlayIcon width={18} height={18} /></span>
                </div>
                <div className="cont__meta"><span className="cont__t">{p.title}</span><span className="cont__c">Ch. {p.chapter} · p.{p.page + 1}</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Rail title="Recommandé pour vous" subtitle={`D'après vos goûts · ${leadGenre} · ${secondGenre}`} items={recommended} loading={recA.loading || recB.loading} taste={taste} showCompat width={158} variant="big" />
      <Rail title="Tendances" items={clean(trending.data)} loading={trending.loading} taste={taste} width={132} />
      {anchor && <Rail title={`Parce que vous avez aimé ${anchor.title}`} items={clean(because.data)} loading={because.loading} taste={taste} width={132} />}
      <Rail title="Pépites" subtitle="Les mieux notées" items={clean(gems.data)} loading={gems.loading} taste={taste} showCompat width={146} variant="big" />
      <Rail title="Nouveautés" items={clean(recent.data)} loading={recent.loading} taste={taste} width={120} />
      {otherGenres.map((g) => <GenreRail key={g} name={g} taste={taste} seen={seen} />)}

      <footer className="home__foot"><Logo size={20} /><p>Ta prochaine lecture, trouvée dans le noir.</p></footer>
    </div>
  );
}

function GenreRail({ name, taste, seen }: { name: string; taste: ReturnType<typeof buildTaste>; seen: Set<string> }) {
  const id = genreId(name)!;
  const { data, loading } = useAsync(`genre-${id}`, () => listByGenre(id, 20));
  return <Rail title={name} items={data ? data.filter((m) => !seen.has(m.id)) : data} loading={loading} taste={taste} width={128} />;
}

function Hero({ manga, taste, fav, onFav }: { manga: Manga; taste: ReturnType<typeof buildTaste>; fav: boolean; onFav: () => void }) {
  const score = compatibility(manga, taste);
  const glow = manga.color ? { ["--ctx" as string]: manga.color } : undefined;
  return (
    <div className="hero-wrap" style={glow as React.CSSProperties}>
      <div className="hero__ctxglow" />
      <section className="hero">
      <div className="hero__art"><Cover manga={manga} shape="hero" priority /></div>
      <div className="hero__scrim" />
      <div className="hero__body">
        <p className="hero__eyebrow">{manga.genres.slice(0, 3).join("  ·  ") || "À découvrir"}</p>
        <h1 className="hero__title">{manga.title}</h1>
        {manga.synopsis && <p className="hero__synopsis">{clamp(manga.synopsis, 150)}</p>}
        <div className="hero__actions">
          <Link to={`/title/${manga.id}`} className="btn btn--solid"><PlayIcon width={18} height={18} /> Voir</Link>
          <button className={`iconbtn iconbtn--lg${fav ? " is-on" : ""}`} onClick={onFav} aria-label={fav ? "Retirer" : "Ajouter à ma liste"}>
            {fav ? <CheckIcon /> : <PlusIcon />}
          </button>
          <div className="hero__ring"><CompatRing score={score} size={56} /></div>
        </div>
      </div>
      </section>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section className="hero hero--skel">
      <Skeleton style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
      <div className="hero__body">
        <Skeleton style={{ width: 120, height: 14, marginBottom: 14 }} />
        <Skeleton style={{ width: "70%", height: 44, marginBottom: 16 }} />
        <Skeleton style={{ width: 160, height: 46, borderRadius: 999 }} />
      </div>
    </section>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 6) return "Nuit blanche";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}
function clamp(s: string, n: number) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}
