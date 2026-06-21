import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getManga } from "@/lib/anilist";
import { findChapters, getPages } from "@/lib/readerSource";
import { NoGatewayError } from "@/lib/net";
import { useAsync } from "@/lib/useAsync";
import { useStore, type AutoSpeed, type ReaderMode } from "@/store/useStore";
import { ChevronLeft, ChevronRight, SettingsIcon, PlayIcon, CloseIcon, CheckIcon } from "@/components/Icons";
import type { Chapter } from "@/lib/types";
import "./Reader.css";

const SPEEDS: AutoSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MODES: { id: ReaderMode; label: string }[] = [
  { id: "vertical", label: "Vertical" },
  { id: "paged", label: "Page à page" },
  { id: "double", label: "Double page" },
];

export function Reader() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const reader = useStore((s) => s.reader);
  const updateReader = useStore((s) => s.updateReader);
  const saved = useStore((s) => s.progress[id]);
  const setProgress = useStore((s) => s.setProgress);
  const markFinished = useStore((s) => s.markFinished);

  const manga = useAsync(`manga-${id}`, () => getManga(id));
  const chapters = useAsync(manga.data ? `chapters-${id}` : null, () =>
    findChapters({ anilistId: id, titles: [...(manga.data!.searchTitles ?? []), manga.data!.title] }));

  const [chapterIndex, setChapterIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [auto, setAuto] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const restored = useRef(false);

  // Pick the starting chapter once the list arrives.
  useEffect(() => {
    if (chapterIndex !== null || !chapters.data) return;
    const list = chapters.data;
    const want = params.get("ch") || saved?.chapter;
    let idx = want ? list.findIndex((c) => c.chapter === want) : -1;
    if (idx < 0) idx = 0;
    setChapterIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters.data]);

  const chapter: Chapter | undefined =
    chapterIndex !== null && chapters.data ? chapters.data[chapterIndex] : undefined;

  const pages = useAsync(chapter ? `pages-${chapter.id}` : null, () =>
    chapter ? getPages(chapter) : Promise.resolve([]),
  );

  // reset restore flag whenever the rendered chapter or mode changes
  useEffect(() => {
    restored.current = false;
    pageEls.current = [];
  }, [chapter?.id, reader.mode, pages.data]);

  const persist = useCallback(
    (p: number, frac: number) => {
      if (!chapter) return;
      setProgress(id, {
        chapterId: chapter.id,
        chapter: chapter.chapter,
        page: p,
        scroll: frac,
        total: chapterIndex ?? 0,
        title: manga.data?.title ?? "",
        coverThumb: manga.data?.coverThumb,
        updatedAt: Date.now(),
      });
    },
    [chapter, id, chapterIndex, manga.data, setProgress],
  );

  const restoreTo = useCallback(
    (targetPage: number, frac: number) => {
      const scroller = scrollerRef.current;
      const el = pageEls.current[targetPage];
      if (!scroller || !el) return;
      if (reader.mode === "vertical") scroller.scrollTop = el.offsetTop + frac * el.offsetHeight;
      else scroller.scrollLeft = el.offsetLeft;
      setPage(targetPage);
    },
    [reader.mode],
  );

  // When a page image loads, if it's our resume target and we haven't restored, jump there.
  const onImgLoad = useCallback(
    (idx: number) => {
      if (restored.current) return;
      const isSavedChapter = saved?.chapter === chapter?.chapter;
      const target = isSavedChapter ? saved!.page : 0;
      if (idx === target) {
        restoreTo(target, isSavedChapter ? saved!.scroll : 0);
        restored.current = true;
      }
    },
    [chapter?.chapter, saved, restoreTo],
  );

  const lastSave = useRef(0);
  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let current = 0;
    let frac = 0;
    if (reader.mode === "vertical") {
      const y = scroller.scrollTop + scroller.clientHeight * 0.32;
      for (let i = 0; i < pageEls.current.length; i++) {
        const el = pageEls.current[i];
        if (el && el.offsetTop <= y) { current = i; frac = clamp((scroller.scrollTop - el.offsetTop) / el.offsetHeight, 0, 1); }
      }
    } else {
      const x = scroller.scrollLeft + scroller.clientWidth * 0.4;
      for (let i = 0; i < pageEls.current.length; i++) {
        const el = pageEls.current[i];
        if (el && el.offsetLeft <= x) current = i;
      }
    }
    setPage(current);
    const now = Date.now();
    if (now - lastSave.current > 700) { lastSave.current = now; persist(current, frac); }
  }, [reader.mode, persist]);

  // auto-scroll (vertical) / auto-advance (paged)
  useEffect(() => {
    if (!auto || !chapter || !pages.data) return;
    setChromeHidden(true);
    if (reader.mode === "vertical") {
      let raf = 0;
      const step = () => {
        const scroller = scrollerRef.current;
        if (scroller) {
          const smart = reader.smartAuto ? 0.8 : 1;
          scroller.scrollTop += 1.7 * reader.autoSpeed * smart;
          if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) { setAuto(false); return; }
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    } else {
      const dwell = 3400 / reader.autoSpeed;
      const t = setTimeout(() => {
        if (page < (pages.data!.length - 1)) goToPage(page + 1);
        else setAuto(false);
      }, dwell);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, page, reader.mode, reader.autoSpeed, reader.smartAuto, chapter, pages.data]);

  const goToPage = useCallback((p: number) => {
    const scroller = scrollerRef.current;
    const el = pageEls.current[p];
    if (!scroller || !el) return;
    if (reader.mode === "vertical") scroller.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    else scroller.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
    setPage(p);
  }, [reader.mode]);

  const changeChapter = useCallback((dir: 1 | -1) => {
    if (chapterIndex === null || !chapters.data) return;
    const next = clamp(chapterIndex + dir, 0, chapters.data.length - 1);
    if (next === chapterIndex) return;
    if (dir === 1 && chapterIndex === chapters.data.length - 1) markFinished(id);
    setAuto(false);
    setChapterIndex(next);
    setPage(0);
    requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 0, left: 0 }));
  }, [chapterIndex, chapters.data, id, markFinished]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      if (e.key === "Escape") navigate(`/title/${id}`);
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); reader.mode === "vertical" ? scrollerRef.current?.scrollBy({ top: 420, behavior: "smooth" }) : goToPage(page + 1); }
      if (e.key === "ArrowLeft") { reader.mode === "vertical" ? scrollerRef.current?.scrollBy({ top: -420, behavior: "smooth" }) : goToPage(Math.max(page - 1, 0)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, reader.mode, settingsOpen, goToPage, navigate, id]);

  // Off-library title + no backend → point to the one thing that unlocks the
  // WHOLE catalogue on demand, instead of a dead-end "read on MangaDex".
  if (chapters.error instanceof NoGatewayError) {
    return (
      <div className="reader-setup">
        <span className="reader-setup__kanji" aria-hidden="true">蔵</span>
        <h2>Active le catalogue complet</h2>
        <p>
          Ce titre n'est pas dans le cache hors-ligne. Pour lire <em>n'importe quel</em>
          titre FR à la demande (tout le catalogue), Tsuku a besoin d'une petite
          passerelle gratuite — déployée <strong>une seule fois</strong>. Le navigateur
          seul ne peut pas récupérer les chapitres (les sources le bloquent).
        </p>
        <div className="reader-setup__cta">
          <button className="btn btn--primary" onClick={() => navigate("/profile")}>Activer le catalogue complet</button>
          {manga.data?.title && (
            <a className="btn btn--ghost" href={`https://mangadex.org/search?q=${encodeURIComponent(manga.data.title)}`} target="_blank" rel="noopener noreferrer">Lire sur MangaDex ↗</a>
          )}
        </div>
      </div>
    );
  }

  if (chapters.error || (chapters.data && chapters.data.length === 0)) {
    return (
      <div className="reader-missing">
        <p>Ce titre n'a pas de chapitres lisibles via nos sources pour le moment.</p>
        <div style={{ display: "flex", gap: "var(--s-3)" }}>
          {manga.data?.title && (
            <a className="btn btn--primary" href={`https://mangadex.org/search?q=${encodeURIComponent(manga.data.title)}`} target="_blank" rel="noopener noreferrer">Chercher sur MangaDex ↗</a>
          )}
          <button className="btn btn--ghost" onClick={() => navigate(`/title/${id}`)}>Retour</button>
        </div>
      </div>
    );
  }

  const pageUrls = pages.data ?? [];
  const total = chapters.data?.length ?? 0;
  const atFirst = (chapterIndex ?? 0) === 0;
  const atLast = chapterIndex !== null && chapterIndex === total - 1;
  const progressPct = pageUrls.length ? ((page + 1) / pageUrls.length) * 100 : 0;

  function handleSurfaceClick(e: React.MouseEvent) {
    if (reader.mode === "vertical") { setChromeHidden((v) => !v); return; }
    const x = e.clientX / window.innerWidth;
    if (x < 0.32) goToPage(Math.max(page - 1, 0));
    else if (x > 0.68) { if (page < pageUrls.length - 1) goToPage(page + 1); else if (!atLast) changeChapter(1); }
    else setChromeHidden((v) => !v);
  }

  const loading = !chapter || pages.loading || !pages.data;

  return (
    <div className={`reader reader--${reader.mode}${chromeHidden ? " is-immersive" : ""}`}>
      <header className="reader__top">
        <button className="iconbtn" onClick={() => navigate(`/title/${id}`)} aria-label="Fermer"><ChevronLeft /></button>
        <div className="reader__heading">
          <span className="reader__title">{manga.data?.title ?? "…"}</span>
          {chapter && <span className="reader__ch">Ch. {chapter.chapter}{chapter.title && chapter.title !== `Chapitre ${chapter.chapter}` ? ` · ${chapter.title}` : ""}</span>}
        </div>
        <button className="iconbtn" onClick={() => setSettingsOpen(true)} aria-label="Réglages"><SettingsIcon /></button>
      </header>

      <div className="reader__surface" ref={scrollerRef} onScroll={onScroll} onClick={handleSurfaceClick}>
        {loading ? (
          <div className="reader__loading"><span className="reader__spinner" /><p>Chargement du chapitre…</p></div>
        ) : (
          <>
            {reader.mode === "vertical" && !atFirst && (
              <button className="reader__prevch" onClick={(e) => { e.stopPropagation(); changeChapter(-1); }}>↑ Chapitre précédent</button>
            )}
            <div className="reader__pages">
              {pageUrls.map((url, p) => (
                <div className="reader__page" key={`${chapter!.id}-${p}`} ref={(el) => { pageEls.current[p] = el; }}>
                  <img src={url} alt={`Page ${p + 1}`} loading={p < 2 ? "eager" : "lazy"} onLoad={() => onImgLoad(p)} draggable={false} />
                </div>
              ))}
            </div>
            <div className="reader__chapterend" onClick={(e) => e.stopPropagation()}>
              <p className="reader__endlabel">Fin du chapitre {chapter!.chapter}</p>
              {!atLast ? (
                <button className="btn btn--primary" onClick={() => changeChapter(1)}><PlayIcon width={16} height={16} /> Chapitre suivant</button>
              ) : (
                <button className="btn btn--solid" onClick={() => { markFinished(id); navigate(`/title/${id}`); }}><CheckIcon width={16} height={16} /> Terminer</button>
              )}
            </div>
          </>
        )}
      </div>

      <footer className="reader__bottom">
        <div className="reader__controls">
          <button className="iconbtn" disabled={atFirst} onClick={() => changeChapter(-1)} aria-label="Chapitre précédent"><ChevronLeft /></button>
          <button className={`reader__auto${auto ? " is-on" : ""}`} onClick={() => setAuto((v) => !v)}>
            {auto ? "⏸ Auto" : <><PlayIcon width={14} height={14} /> Auto {reader.autoSpeed}×</>}
          </button>
          <button className="iconbtn" disabled={!!atLast} onClick={() => changeChapter(1)} aria-label="Chapitre suivant"><ChevronRight /></button>
        </div>
        <div className="reader__progress">
          <span className="reader__pageno">{pageUrls.length ? `${page + 1} / ${pageUrls.length}` : "—"}</span>
          <div className="reader__track"><span style={{ width: `${progressPct}%` }} /></div>
        </div>
      </footer>

      {settingsOpen && (
        <div className="sheet-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Réglages de lecture">
            <div className="sheet__grab" />
            <div className="sheet__head"><h3>Lecture</h3><button className="iconbtn" onClick={() => setSettingsOpen(false)} aria-label="Fermer"><CloseIcon width={18} height={18} /></button></div>
            <p className="sheet__label">Mode</p>
            <div className="seg">
              {MODES.map((md) => <button key={md.id} className={`seg__btn${reader.mode === md.id ? " is-on" : ""}`} onClick={() => updateReader({ mode: md.id })}>{md.label}</button>)}
            </div>
            <p className="sheet__label">Vitesse auto-scroll</p>
            <div className="speedrow">
              {SPEEDS.map((s) => <button key={s} className={`speedchip${reader.autoSpeed === s ? " is-on" : ""}`} onClick={() => updateReader({ autoSpeed: s })}>{s}×</button>)}
            </div>
            <button className="sheet__toggle" onClick={() => updateReader({ smartAuto: !reader.smartAuto })}>
              <span><strong>Vitesse intelligente</strong><small>Adapte le défilement au confort de lecture.</small></span>
              <span className={`switch${reader.smartAuto ? " is-on" : ""}`}><span /></span>
            </button>
            <button className="sheet__toggle" onClick={() => { setChromeHidden(true); setSettingsOpen(false); }}>
              <span><strong>Mode immersion</strong><small>Masque l'interface. Touche le centre de l'écran pour la rappeler.</small></span>
              <span className="switch"><span /></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
