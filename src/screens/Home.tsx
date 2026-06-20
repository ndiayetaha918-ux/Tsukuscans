import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { buildTaste, compatibility } from "@/lib/recommend";
import { listPopular, listRecent, listByGenre, GENRES } from "@/lib/mangadex";
import { useAsync } from "@/lib/useAsync";
import { Rail } from "@/components/Rail";
import { Cover } from "@/components/Cover";
import { CompatRing } from "@/components/CompatRing";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/Skeleton";
import { PlayIcon, PlusIcon, CheckIcon } from "@/components/Icons";
import type { Manga } from "@/lib/types";
import "./Home.css";

const genreId = (name: string) => GENRES.find((g) => g.name === name)?.id;

export function Home() {
  const picks = useStore((s) => s.picks);
  const favorites = useStore((s) => s.favorites);
  const progress = useStore((s) => s.progress);
  const finished = useStore((s) => s.finished);
  const displayName = useStore((s) => s.displayName);
  const isFavorite = useStore((s) => s.isFavorite);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);

  // Personalised lead genre (falls back gracefully on cold start).
  const leadGenre = taste.topGenres.find((g) => genreId(g)) ?? "Action";
  const leadId = genreId(leadGenre)!;

  const recommended = useAsync(`rec-${leadId}`, () => listByGenre(leadId, 18));
  const trending = useAsync("trending", () => listPopular(20));
  const recent = useAsync("recent", () => listRecent(18));

  const genreRails = useMemo(() => {
    const names = (taste.topGenres.filter((g) => genreId(g)).slice(0, 4));
    while (names.length < 3) {
      const fill = ["Fantasy", "Romance", "Aventure", "Action"].find((g) => !names.includes(g))!;
      names.push(fill);
    }
    return names;
  }, [taste.topGenres]);

  const hero = recommended.data?.[0] ?? trending.data?.[0];

  const continueItems = useMemo(
    () =>
      Object.entries(progress)
        .filter(([id]) => !finished.includes(id))
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        .slice(0, 8),
    [progress, finished],
  );

  return (
    <div className="home page">
      <header className="home__bar">
        <Link to="/" aria-label="Tsuki, accueil"><Logo size={26} /></Link>
        <Link to="/profile" className="home__avatar" aria-label="Profil">
          {(displayName ?? "T").slice(0, 1).toUpperCase()}
        </Link>
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
                <div className="cont__meta">
                  <span className="cont__t">{p.title}</span>
                  <span className="cont__c">Ch. {p.chapter} · p.{p.page + 1}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Rail title="Recommandé pour vous" subtitle={`Calculé à partir de vos goûts · ${leadGenre}`} items={recommended.data} loading={recommended.loading} taste={taste} showCompat width={150} />
      <Rail title="Tendances" items={trending.data} loading={trending.loading} taste={taste} />
      <Rail title="Nouveautés" items={recent.data} loading={recent.loading} taste={taste} />
      {genreRails.map((g) => (
        <GenreRail key={g} name={g} taste={taste} />
      ))}

      <footer className="home__foot"><Logo size={20} /><p>Ta prochaine lecture, trouvée dans le noir.</p></footer>
    </div>
  );
}

function GenreRail({ name, taste }: { name: string; taste: ReturnType<typeof buildTaste> }) {
  const id = genreId(name)!;
  const { data, loading } = useAsync(`genre-${id}`, () => listByGenre(id, 18));
  return <Rail title={name} items={data} loading={loading} taste={taste} />;
}

function Hero({ manga, taste, fav, onFav }: { manga: Manga; taste: ReturnType<typeof buildTaste>; fav: boolean; onFav: () => void }) {
  const score = compatibility(manga, taste);
  return (
    <section className="hero">
      <div className="hero__art"><Cover manga={manga} shape="hero" priority /></div>
      <div className="hero__scrim" />
      <div className="hero__body">
        <p className="hero__eyebrow">{manga.genres.slice(0, 3).join("  ·  ") || "À découvrir"}</p>
        <h1 className="hero__title">{manga.title}</h1>
        {manga.synopsis && <p className="hero__synopsis">{clamp(manga.synopsis, 150)}</p>}
        <div className="hero__actions">
          <Link to={`/reader/${manga.id}`} className="btn btn--solid"><PlayIcon width={18} height={18} /> Lire</Link>
          <button className={`iconbtn iconbtn--lg${fav ? " is-on" : ""}`} onClick={onFav} aria-label={fav ? "Retirer" : "Ajouter à ma liste"}>
            {fav ? <CheckIcon /> : <PlusIcon />}
          </button>
          <div className="hero__ring"><CompatRing score={score} size={56} /></div>
        </div>
      </div>
    </section>
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
