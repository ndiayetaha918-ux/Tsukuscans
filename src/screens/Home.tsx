import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { buildProfile, buildHomeRails, compatibility } from "@/lib/recommend";
import { getManga } from "@/data/catalog";
import { Rail } from "@/components/Rail";
import { CoverArt } from "@/components/CoverArt";
import { CompatRing } from "@/components/CompatRing";
import { PlayIcon, PlusIcon, CheckIcon, BellIcon, StarIcon } from "@/components/Icons";
import "./Home.css";

export function Home() {
  const signal = useStore((s) => s.behaviorSignal());
  const progress = useStore((s) => s.progress);
  const finished = useStore((s) => s.finished);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const displayName = useStore((s) => s.displayName);

  const taste = useMemo(() => buildProfile(signal), [signal]);
  const rails = useMemo(() => buildHomeRails(signal, taste), [signal, taste]);

  const continueItems = useMemo(
    () =>
      Object.entries(progress)
        .filter(([id]) => !finished.includes(id))
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        .map(([id, p]) => ({ manga: getManga(id)!, p }))
        .filter((x) => x.manga)
        .slice(0, 8),
    [progress, finished],
  );

  const hero = rails.find((r) => r.id === "for-you")?.items[0] ?? rails[0]?.items[0];
  const heroScore = hero ? compatibility(hero, taste) : 0;
  const greeting = greet();

  return (
    <div className="home page">
      <header className="home__bar">
        <Link to="/" className="home__brand" aria-label="Tsuki Scans, accueil">
          <span className="home__brandmoon" />
          tsuki
        </Link>
        <div className="home__baractions">
          <button className="iconbtn" aria-label="Notifications"><BellIcon /></button>
          <Link to="/profile" className="home__avatar" aria-label="Profil">
            {(displayName ?? "T").slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </header>

      {hero && (
        <section className="hero">
          <div className="hero__art">
            <CoverArt manga={hero} variant="hero" />
            <div className="hero__scrim" />
          </div>
          <div className="hero__body">
            <p className="hero__eyebrow"><StarIcon width={13} height={13} /> {hero.rating.toFixed(1)} · {hero.status}</p>
            <h1 className="hero__title">{hero.title}</h1>
            <p className="hero__genres">{hero.genres.slice(0, 3).join("  ·  ")}</p>
            <p className="hero__synopsis">{hero.tagline}</p>
            <div className="hero__actions">
              <Link to={`/reader/${hero.id}`} className="btn btn--solid">
                <PlayIcon width={18} height={18} /> Lire maintenant
              </Link>
              <button
                className={`iconbtn iconbtn--lg${favorites.includes(hero.id) ? " is-on" : ""}`}
                onClick={() => toggleFavorite(hero.id)}
                aria-label={favorites.includes(hero.id) ? "Retirer des favoris" : "Ajouter à la liste"}
              >
                {favorites.includes(hero.id) ? <CheckIcon /> : <PlusIcon />}
              </button>
              <div className="hero__ring"><CompatRing score={heroScore} size={56} /></div>
            </div>
          </div>
        </section>
      )}

      {continueItems.length > 0 && (
        <section className="rail continue">
          <header className="rail__head">
            <h2 className="rail__title">{greeting}{displayName ? `, ${displayName}` : ""} — on reprend ?</h2>
          </header>
          <div className="rail__track no-scrollbar">
            {continueItems.map(({ manga, p }) => (
              <Link to={`/reader/${manga.id}`} key={manga.id} className="cont">
                <div className="cont__poster">
                  <CoverArt manga={manga} variant="tile" />
                  <span className="cont__play"><PlayIcon width={18} height={18} /></span>
                  <span className="cont__bar"><span style={{ width: `${chapterPct(p.chapterNumber, manga.chapters.length)}%` }} /></span>
                </div>
                <div className="cont__meta">
                  <span className="cont__t">{manga.title}</span>
                  <span className="cont__c">Chapitre {p.chapterNumber} · p.{p.page + 1}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {rails.map((rail) => (
        <Rail key={rail.id} rail={rail} taste={taste} />
      ))}

      <footer className="home__foot">
        <span className="home__brandmoon" />
        <p>Tsuki Scans — ta prochaine lecture, trouvée dans le noir.</p>
      </footer>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 6) return "Nuit blanche";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}
function chapterPct(n: number, total: number) {
  return Math.max(4, Math.min(100, (n / total) * 100));
}
