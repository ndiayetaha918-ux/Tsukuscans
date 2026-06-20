import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getManga, getChapters, getStatistics } from "@/lib/mangadex";
import { useAsync } from "@/lib/useAsync";
import { useStore } from "@/store/useStore";
import { buildTaste, compatibility } from "@/lib/recommend";
import { Cover } from "@/components/Cover";
import { CompatRing } from "@/components/CompatRing";
import { Skeleton } from "@/components/Skeleton";
import { PlayIcon, PlusIcon, ChevronLeft, StarIcon, HeartIcon } from "@/components/Icons";
import "./Detail.css";

export function Detail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const picks = useStore((s) => s.picks);
  const favorites = useStore((s) => s.favorites);
  const isFavorite = useStore((s) => s.isFavorite);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const progress = useStore((s) => s.progress[id]);
  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);

  const manga = useAsync(`manga-${id}`, () => getManga(id));
  const chapters = useAsync(`chapters-${id}`, () => getChapters(id));
  const stats = useAsync(`stats-${id}`, () => getStatistics([id]));

  if (manga.error) {
    return (
      <div className="page detail-missing">
        <p>Œuvre indisponible.</p>
        <Link to="/" className="btn btn--ghost">Retour à l'accueil</Link>
      </div>
    );
  }
  if (!manga.data) {
    return (
      <div className="page">
        <Skeleton style={{ height: 400, borderRadius: 0 }} />
        <div style={{ padding: "var(--s-5) var(--rail-gutter)" }}>
          <Skeleton style={{ height: 36, width: "60%", marginBottom: 12 }} />
          <Skeleton style={{ height: 16, width: "40%" }} />
        </div>
      </div>
    );
  }

  const m = manga.data;
  const rating = stats.data?.[id]?.rating;
  const score = compatibility(m, taste);
  const fav = isFavorite(m.id);
  const chs = chapters.data ?? [];

  return (
    <div className="detail page">
      <div className="detail__hero">
        <div className="detail__heroart"><Cover manga={m} shape="hero" priority /></div>
        <div className="detail__heroscrim" />
        <button className="iconbtn detail__back" onClick={() => navigate(-1)} aria-label="Retour"><ChevronLeft /></button>
        <div className="detail__heroinfo">
          <div className="detail__poster"><Cover manga={m} shape="poster" /></div>
          <div className="detail__herometa">
            <h1 className="detail__title">{m.title}</h1>
            <p className="detail__author">{m.author}{m.year ? ` · ${m.year}` : ""}</p>
            <div className="detail__stats">
              {rating != null && <><span className="detail__stat"><StarIcon width={14} height={14} /> {rating.toFixed(1)}</span><span className="detail__dot" /></>}
              <span className="detail__stat">{m.status}</span>
              {chs.length > 0 && <><span className="detail__dot" /><span className="detail__stat">{chs.length} ch.</span></>}
            </div>
          </div>
        </div>
      </div>

      <div className="detail__bar">
        <Link to={`/reader/${m.id}`} className="btn btn--primary detail__read">
          <PlayIcon width={18} height={18} />{progress ? `Reprendre — ch. ${progress.chapter}` : "Lire maintenant"}
        </Link>
        <button className={`iconbtn iconbtn--lg${fav ? " is-on" : ""}`} onClick={() => toggleFavorite(m)} aria-label={fav ? "Retirer" : "Ajouter à ma liste"}>
          {fav ? <HeartIcon style={{ fill: "currentColor" }} /> : <PlusIcon />}
        </button>
        <div className="detail__compat"><CompatRing score={score} size={54} /></div>
      </div>

      <div className="detail__about">
        {m.synopsis && <p className="detail__synopsis">{m.synopsis}</p>}
        <div className="detail__tags">
          {m.genres.map((g) => <span key={g} className="chip">{g}</span>)}
          {m.tags.slice(0, 4).map((t) => <span key={t} className="chip chip--mute">{t}</span>)}
        </div>
      </div>

      <section className="detail__chapters">
        <header className="detail__chhead">
          <h2 className="rail__title">Chapitres</h2>
          {chs.length > 0 && <span className="detail__chcount">{chs.length}</span>}
        </header>
        {chapters.loading ? (
          <div className="chlist">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 58, marginBottom: 8 }} />)}</div>
        ) : chs.length === 0 ? (
          <p className="detail__nochap">Aucun chapitre en français/anglais pour le moment.</p>
        ) : (
          <ul className="chlist">
            {chs.map((c) => {
              const current = progress?.chapterId === c.id;
              return (
                <li key={c.id} className={`chrow${current ? " is-current" : ""}`}>
                  <Link to={`/reader/${m.id}?ch=${encodeURIComponent(c.chapter)}`} className="chrow__main">
                    <span className="chrow__num">{c.chapter}</span>
                    <span className="chrow__text">
                      <span className="chrow__title">{c.title}</span>
                      <span className="chrow__sub">{c.pages > 0 ? `${c.pages} pages · ` : ""}{fmtDate(c.publishAt)}{c.group ? ` · ${c.group}` : ""}</span>
                    </span>
                    {current && <span className="chrow__badge">En cours</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}
