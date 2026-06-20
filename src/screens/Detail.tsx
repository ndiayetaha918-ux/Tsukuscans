import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getManga } from "@/lib/anilist";
import { findChapters } from "@/lib/readerSource";
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
  const titles = manga.data?.searchTitles;
  const chapters = useAsync(titles?.length ? `chapters-${id}` : null, () => findChapters(titles!));

  const setAmbient = useStore((s) => s.setAmbient);
  useEffect(() => { if (manga.data) setAmbient(manga.data.color, manga.data.id); }, [manga.data, setAmbient]);

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
  const rating = m.rating;
  const score = compatibility(m, taste);
  const fav = isFavorite(m.id);
  const chs = chapters.data ?? [];
  const ctx = m.color ? ({ ["--ctx" as string]: m.color } as React.CSSProperties) : undefined;

  return (
    <div className="detail page" style={ctx}>
      <div className="detail__ctxglow" />
      <div className="detail__hero">
        <div className="detail__heroart">
          <Cover manga={m} shape="hero" priority />
          <TrailerOverlay trailer={m.trailer} />
        </div>
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
          <div className="detail__nochap">
            <p>Lecture intégrée indisponible pour cette œuvre (source injoignable).</p>
            <a className="btn btn--ghost" href={`https://mangadex.org/search?q=${encodeURIComponent(m.title)}`} target="_blank" rel="noopener noreferrer">
              Chercher sur MangaDex ↗
            </a>
          </div>
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

/* Plays the work's most relevant YouTube trailer (from AniList) over the hero
   after a few seconds — muted, looping, like a streaming detail page. */
function TrailerOverlay({ trailer }: { trailer?: { id: string; site: string } }) {
  const [show, setShow] = useState(false);
  const isYouTube = trailer?.site?.toLowerCase() === "youtube" && trailer.id;
  useEffect(() => {
    if (!isYouTube) return;
    const t = setTimeout(() => setShow(true), 3800);
    return () => clearTimeout(t);
  }, [isYouTube, trailer?.id]);
  if (!isYouTube || !show) return null;
  const src = `https://www.youtube-nocookie.com/embed/${trailer!.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer!.id}&modestbranding=1&playsinline=1&rel=0&showinfo=0`;
  return (
    <div className="detail__trailer">
      <iframe
        src={src}
        title="Bande-annonce"
        allow="autoplay; encrypted-media"
        frameBorder="0"
        loading="lazy"
      />
    </div>
  );
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}
