import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getManga } from "@/data/catalog";
import { useStore } from "@/store/useStore";
import { buildProfile, compatibility } from "@/lib/recommend";
import { CoverArt } from "@/components/CoverArt";
import { CompatRing } from "@/components/CompatRing";
import {
  PlayIcon, PlusIcon, CheckIcon, DownloadIcon, ChevronLeft, StarIcon, HeartIcon,
} from "@/components/Icons";
import "./Detail.css";

export function Detail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const manga = getManga(id);

  const signal = useStore((s) => s.behaviorSignal());
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const progress = useStore((s) => s.progress[id]);
  const downloads = useStore((s) => s.downloads[id] ?? []);
  const toggleDownloadChapter = useStore((s) => s.toggleDownloadChapter);
  const toggleDownloadAll = useStore((s) => s.toggleDownloadAll);

  const taste = useMemo(() => buildProfile(signal), [signal]);

  if (!manga) {
    return (
      <div className="page detail-missing">
        <p>Œuvre introuvable.</p>
        <Link to="/" className="btn btn--ghost">Retour à l'accueil</Link>
      </div>
    );
  }

  const score = compatibility(manga, taste);
  const isFav = favorites.includes(manga.id);
  const allChapterIds = manga.chapters.map((c) => c.id);
  const allDownloaded = allChapterIds.every((c) => downloads.includes(c));
  const resumeChapter = progress?.chapterNumber ?? 1;

  return (
    <div className="detail page">
      <div className="detail__hero">
        <div className="detail__heroart">
          <CoverArt manga={manga} variant="hero" />
          <div className="detail__heroscrim" />
        </div>
        <button className="iconbtn detail__back" onClick={() => navigate(-1)} aria-label="Retour">
          <ChevronLeft />
        </button>

        <div className="detail__heroinfo">
          <div className="detail__poster">
            <CoverArt manga={manga} variant="tile" />
          </div>
          <div className="detail__herometa">
            <h1 className="detail__title">{manga.title}</h1>
            <p className="detail__author">{manga.author} · {manga.year}</p>
            <div className="detail__stats">
              <span className="detail__stat"><StarIcon width={14} height={14} /> {manga.rating.toFixed(1)}</span>
              <span className="detail__dot" />
              <span className="detail__stat">{manga.status}</span>
              <span className="detail__dot" />
              <span className="detail__stat">{manga.chapters.length} ch.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail__bar">
        <Link to={`/reader/${manga.id}`} className="btn btn--primary detail__read">
          <PlayIcon width={18} height={18} />
          {progress ? `Reprendre — ch. ${resumeChapter}` : "Lire maintenant"}
        </Link>
        <button
          className={`iconbtn iconbtn--lg${isFav ? " is-on" : ""}`}
          onClick={() => toggleFavorite(manga.id)}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {isFav ? <HeartIcon style={{ fill: "currentColor" }} /> : <PlusIcon />}
        </button>
        <button
          className={`iconbtn iconbtn--lg${allDownloaded ? " is-on" : ""}`}
          onClick={() => toggleDownloadAll(manga.id, allChapterIds)}
          aria-label={allDownloaded ? "Supprimer le téléchargement" : "Télécharger le tome"}
          title={allDownloaded ? "Hors-ligne — tout" : "Télécharger pour lecture hors-ligne"}
        >
          {allDownloaded ? <CheckIcon /> : <DownloadIcon />}
        </button>
        <div className="detail__compat"><CompatRing score={score} size={54} /></div>
      </div>

      <div className="detail__about">
        <p className="detail__synopsis">{manga.synopsis}</p>
        <div className="detail__tags">
          {manga.genres.map((g) => <span key={g} className="chip">{g}</span>)}
          {manga.tags.slice(0, 4).map((t) => <span key={t} className="chip chip--mute">{t}</span>)}
        </div>
      </div>

      <section className="detail__chapters">
        <header className="detail__chhead">
          <h2 className="rail__title">Chapitres</h2>
          <span className="detail__chcount">{manga.chapters.length}</span>
        </header>
        <ul className="chlist">
          {manga.chapters.map((c) => {
            const read = progress ? c.number < progress.chapterNumber : false;
            const current = progress?.chapterNumber === c.number;
            const dl = downloads.includes(c.id);
            return (
              <li key={c.id} className={`chrow${current ? " is-current" : ""}${read ? " is-read" : ""}`}>
                <Link to={`/reader/${manga.id}?ch=${c.number}`} className="chrow__main">
                  <span className="chrow__num">{c.number}</span>
                  <span className="chrow__text">
                    <span className="chrow__title">{c.title}</span>
                    <span className="chrow__sub">{c.pages} pages · {fmtDate(c.releasedAt)}</span>
                  </span>
                  {current && <span className="chrow__badge">En cours</span>}
                </Link>
                <button
                  className={`chrow__dl${dl ? " is-on" : ""}`}
                  onClick={() => toggleDownloadChapter(manga.id, c.id)}
                  aria-label={dl ? "Téléchargé — supprimer" : "Télécharger ce chapitre"}
                >
                  {dl ? <CheckIcon width={18} height={18} /> : <DownloadIcon width={18} height={18} />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
