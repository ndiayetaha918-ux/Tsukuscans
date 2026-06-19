import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getManga } from "@/data/catalog";
import { useStore, type AutoSpeed, type ReaderMode } from "@/store/useStore";
import { PageArt, pageDensity } from "@/components/PageArt";
import {
  ChevronLeft, ChevronRight, SettingsIcon, PlayIcon, CloseIcon, CheckIcon,
} from "@/components/Icons";
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
  const manga = getManga(id);

  const reader = useStore((s) => s.reader);
  const updateReader = useStore((s) => s.updateReader);
  const savedProgress = useStore((s) => s.progress[id]);
  const setProgress = useStore((s) => s.setProgress);
  const markFinished = useStore((s) => s.markFinished);

  // Which chapter we're in. ?ch= wins, else saved, else first.
  const startCh = Number(params.get("ch")) || savedProgress?.chapterNumber || 1;
  const [chapterIndex, setChapterIndex] = useState(() =>
    manga ? clamp(startCh - 1, 0, manga.chapters.length - 1) : 0,
  );
  const [page, setPage] = useState(0);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [auto, setAuto] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const restored = useRef(false);

  const chapter = manga?.chapters[chapterIndex];

  // ---- restore exact position when the chapter first lays out ----
  useLayoutEffect(() => {
    restored.current = false;
  }, [chapterIndex, reader.mode]);

  useLayoutEffect(() => {
    if (!manga || !chapter || restored.current) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const isSavedChapter = savedProgress?.chapterNumber === chapter.number;
    const targetPage = isSavedChapter ? savedProgress!.page : 0;
    const frac = isSavedChapter ? savedProgress!.scroll : 0;
    const el = pageEls.current[targetPage];
    if (reader.mode === "vertical") {
      if (el) scroller.scrollTop = el.offsetTop + frac * el.offsetHeight;
    } else {
      const target = pageEls.current[reader.mode === "double" ? targetPage - (targetPage % 2) : targetPage];
      if (target) scroller.scrollLeft = target.offsetLeft;
    }
    setPage(targetPage);
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, reader.mode, manga]);

  // ---- track current page + persist progress (throttled) ----
  const persist = useCallback(
    (p: number, frac: number) => {
      if (!manga || !chapter) return;
      setProgress(manga.id, {
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        page: p,
        scroll: frac,
        updatedAt: Date.now(),
      });
    },
    [manga, chapter, setProgress],
  );

  const lastSave = useRef(0);
  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !restored.current) return;
    let current = 0;
    let frac = 0;
    if (reader.mode === "vertical") {
      const y = scroller.scrollTop + scroller.clientHeight * 0.32;
      for (let i = 0; i < pageEls.current.length; i++) {
        const el = pageEls.current[i];
        if (el && el.offsetTop <= y) {
          current = i;
          frac = clamp((scroller.scrollTop - el.offsetTop) / el.offsetHeight, 0, 1);
        }
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
    if (now - lastSave.current > 700) {
      lastSave.current = now;
      persist(current, frac);
    }
  }, [reader.mode, persist]);

  // ---- auto-scroll (vertical) / auto-advance (paged) ----
  useEffect(() => {
    if (!auto || !manga || !chapter) return;
    setChromeHidden(true);
    if (reader.mode === "vertical") {
      let raf = 0;
      const step = () => {
        const scroller = scrollerRef.current;
        if (scroller) {
          const dens = pageEls.current[page] ? pageDensity(`${chapter.id}:${page}`) : 0.5;
          const smart = reader.smartAuto ? 1 - dens * 0.55 : 1;
          const px = 1.7 * reader.autoSpeed * smart;
          scroller.scrollTop += px;
          if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
            setAuto(false);
            return;
          }
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    } else {
      const dens = pageDensity(`${chapter.id}:${page}`);
      const base = 3600 / reader.autoSpeed;
      const dwell = reader.smartAuto ? base * (0.7 + dens * 0.8) : base;
      const t = setTimeout(() => {
        if (page < chapter.pages - 1) goToPage(page + 1);
        else setAuto(false);
      }, dwell);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, page, reader.mode, reader.autoSpeed, reader.smartAuto, chapter]);

  const goToPage = useCallback(
    (p: number) => {
      const scroller = scrollerRef.current;
      const el = pageEls.current[p];
      if (!scroller || !el) return;
      if (reader.mode === "vertical") scroller.scrollTo({ top: el.offsetTop, behavior: "smooth" });
      else scroller.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
      setPage(p);
    },
    [reader.mode],
  );

  const changeChapter = useCallback(
    (dir: 1 | -1) => {
      if (!manga) return;
      const next = clamp(chapterIndex + dir, 0, manga.chapters.length - 1);
      if (next === chapterIndex) return;
      if (dir === 1 && chapterIndex === manga.chapters.length - 1) markFinished(manga.id);
      pageEls.current = [];
      setAuto(false);
      setChapterIndex(next);
      setPage(0);
      requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 0, left: 0 }));
    },
    [manga, chapterIndex, markFinished],
  );

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); reader.mode === "vertical" ? scrollerRef.current?.scrollBy({ top: 400, behavior: "smooth" }) : goToPage(Math.min(page + 1, (chapter?.pages ?? 1) - 1)); }
      if (e.key === "ArrowLeft") { reader.mode === "vertical" ? scrollerRef.current?.scrollBy({ top: -400, behavior: "smooth" }) : goToPage(Math.max(page - 1, 0)); }
      if (e.key === "Escape") navigate(`/title/${id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, chapter, reader.mode, settingsOpen, goToPage, navigate, id]);

  if (!manga || !chapter) {
    return (
      <div className="reader-missing">
        <p>Chapitre introuvable.</p>
        <button className="btn btn--ghost" onClick={() => navigate("/")}>Accueil</button>
      </div>
    );
  }

  const pages = Array.from({ length: chapter.pages }, (_, i) => i);
  const atFirst = chapterIndex === 0;
  const atLast = chapterIndex === manga.chapters.length - 1;
  const progressPct = ((page + 1) / chapter.pages) * 100;

  function handleSurfaceClick(e: React.MouseEvent) {
    if (!chapter) return;
    if (reader.mode === "vertical") {
      setChromeHidden((v) => !v);
      return;
    }
    // paged: edge taps navigate, center toggles chrome
    const x = e.clientX / window.innerWidth;
    if (x < 0.32) goToPage(Math.max(page - 1, 0));
    else if (x > 0.68) {
      if (page < chapter.pages - 1) goToPage(page + 1);
      else if (!atLast) changeChapter(1);
    } else setChromeHidden((v) => !v);
  }

  return (
    <div className={`reader reader--${reader.mode}${chromeHidden ? " is-immersive" : ""}`}>
      {/* Top chrome */}
      <header className="reader__top">
        <button className="iconbtn" onClick={() => navigate(`/title/${id}`)} aria-label="Fermer le lecteur">
          <ChevronLeft />
        </button>
        <div className="reader__heading">
          <span className="reader__title">{manga.title}</span>
          <span className="reader__ch">Ch. {chapter.number} · {chapter.title}</span>
        </div>
        <button className="iconbtn" onClick={() => setSettingsOpen(true)} aria-label="Réglages de lecture">
          <SettingsIcon />
        </button>
      </header>

      {/* Reading surface */}
      <div
        className="reader__surface"
        ref={scrollerRef}
        onScroll={onScroll}
        onClick={handleSurfaceClick}
      >
        {reader.mode === "vertical" && !atFirst && (
          <button className="reader__prevch" onClick={(e) => { e.stopPropagation(); changeChapter(-1); }}>
            ↑ Chapitre précédent
          </button>
        )}
        <div className="reader__pages">
          {pages.map((p) => (
            <div
              className="reader__page"
              key={p}
              ref={(el) => {
                pageEls.current[p] = el;
              }}
            >
              <PageArt manga={manga} chapterId={chapter.id} page={p} />
            </div>
          ))}
        </div>
        <div className="reader__chapterend" onClick={(e) => e.stopPropagation()}>
          <p className="reader__endlabel">Fin du chapitre {chapter.number}</p>
          {!atLast ? (
            <button className="btn btn--primary" onClick={() => changeChapter(1)}>
              <PlayIcon width={16} height={16} /> Chapitre suivant
            </button>
          ) : (
            <button className="btn btn--solid" onClick={() => { markFinished(manga.id); navigate(`/title/${id}`); }}>
              <CheckIcon width={16} height={16} /> Terminer
            </button>
          )}
        </div>
      </div>

      {/* Bottom chrome */}
      <footer className="reader__bottom">
        <div className="reader__controls">
          <button className="iconbtn" disabled={atFirst} onClick={() => changeChapter(-1)} aria-label="Chapitre précédent">
            <ChevronLeft />
          </button>
          <button
            className={`reader__auto${auto ? " is-on" : ""}`}
            onClick={() => setAuto((v) => !v)}
          >
            {auto ? "⏸ Auto" : <><PlayIcon width={14} height={14} /> Auto {reader.autoSpeed}×</>}
          </button>
          <button className="iconbtn" disabled={atLast} onClick={() => changeChapter(1)} aria-label="Chapitre suivant">
            <ChevronRight />
          </button>
        </div>
        <div className="reader__progress">
          <span className="reader__pageno">{page + 1} / {chapter.pages}</span>
          <div className="reader__track"><span style={{ width: `${progressPct}%` }} /></div>
        </div>
      </footer>

      {/* Settings sheet */}
      {settingsOpen && (
        <div className="sheet-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Réglages de lecture">
            <div className="sheet__grab" />
            <div className="sheet__head">
              <h3>Lecture</h3>
              <button className="iconbtn" onClick={() => setSettingsOpen(false)} aria-label="Fermer"><CloseIcon width={18} height={18} /></button>
            </div>

            <p className="sheet__label">Mode</p>
            <div className="seg">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`seg__btn${reader.mode === m.id ? " is-on" : ""}`}
                  onClick={() => updateReader({ mode: m.id })}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <p className="sheet__label">Vitesse auto-scroll</p>
            <div className="speedrow">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`speedchip${reader.autoSpeed === s ? " is-on" : ""}`}
                  onClick={() => updateReader({ autoSpeed: s })}
                >
                  {s}×
                </button>
              ))}
            </div>

            <button className="sheet__toggle" onClick={() => updateReader({ smartAuto: !reader.smartAuto })}>
              <span>
                <strong>Vitesse intelligente</strong>
                <small>Ralentit sur les pages denses, accélère sur les pages aérées.</small>
              </span>
              <span className={`switch${reader.smartAuto ? " is-on" : ""}`}><span /></span>
            </button>

            <button className="sheet__toggle" onClick={() => setChromeHidden((v) => !v)}>
              <span>
                <strong>Mode immersion</strong>
                <small>Masque l'interface. Touche le centre de l'écran pour la rappeler.</small>
              </span>
              <span className={`switch${chromeHidden ? " is-on" : ""}`}><span /></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
