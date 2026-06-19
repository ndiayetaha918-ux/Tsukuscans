import { useRef } from "react";
import type { Rail as RailData } from "@/lib/recommend";
import { MangaCard } from "./MangaCard";
import { CompatRing } from "./CompatRing";
import { CoverArt } from "./CoverArt";
import { Link } from "react-router-dom";
import { ChevronRight, PlayIcon } from "./Icons";
import { compatibility, type TasteProfile } from "@/lib/recommend";
import "./Rail.css";

export function Rail({ rail, taste }: { rail: RailData; taste: TasteProfile }) {
  const scroller = useRef<HTMLDivElement>(null);

  if (rail.kind === "spotlight") {
    return <SpotlightRail rail={rail} taste={taste} />;
  }

  return (
    <section className="rail">
      <header className="rail__head">
        <div>
          <h2 className="rail__title">{rail.title}</h2>
          {rail.subtitle && <p className="rail__sub">{rail.subtitle}</p>}
        </div>
      </header>
      <div className="rail__track no-scrollbar" ref={scroller}>
        {rail.items.map((m) => (
          <MangaCard key={m.id} manga={m} width={132} showMeta />
        ))}
      </div>
    </section>
  );
}

/* The hero rail: bigger posters, compatibility ring, immediate-read button. */
function SpotlightRail({ rail, taste }: { rail: RailData; taste: TasteProfile }) {
  return (
    <section className="rail rail--spotlight">
      <header className="rail__head">
        <div>
          <h2 className="rail__title">{rail.title}</h2>
          {rail.subtitle && <p className="rail__sub">{rail.subtitle}</p>}
        </div>
      </header>
      <div className="rail__track rail__track--spot no-scrollbar">
        {rail.items.slice(0, 8).map((m) => {
          const score = compatibility(m, taste);
          return (
            <article key={m.id} className="spot">
              <Link to={`/title/${m.id}`} className="spot__poster">
                <CoverArt manga={m} variant="tile" />
                <div className="spot__ring">
                  <CompatRing score={score} size={46} />
                </div>
              </Link>
              <div className="spot__body">
                <div className="spot__genres">{m.genres.slice(0, 2).join(" · ")}</div>
                <Link to={`/reader/${m.id}`} className="spot__play">
                  <PlayIcon width={15} height={15} /> Lire
                </Link>
              </div>
            </article>
          );
        })}
        <Link to="/discover" className="spot spot--more">
          <span className="spot__morecircle"><ChevronRight /></span>
          <span className="spot__morelabel">Feed découverte</span>
        </Link>
      </div>
    </section>
  );
}
