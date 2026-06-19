import { memo } from "react";
import type { Manga } from "@/lib/types";
import "./CoverArt.css";

type Variant = "tile" | "poster" | "hero" | "feed";

/* Procedural poster art. Each title renders a deterministic composition from
   its two palette hues + motif, so the catalog feels art-directed without
   shipping (or breaking on) external imagery. The title is the hero. */
function CoverArtImpl({ manga, variant = "poster" }: { manga: Manga; variant?: Variant }) {
  const [h1, h2] = manga.palette;
  const style = {
    "--h1": h1,
    "--h2": h2,
  } as React.CSSProperties;

  return (
    <div className={`cover cover--${variant} cover--${manga.motif}`} style={style} aria-hidden="true">
      <div className="cover__field" />
      <Motif motif={manga.motif} />
      <div className="cover__grain" />
      <div className="cover__vignette" />
      <div className="cover__caption">
        <span className="cover__author">{manga.author}</span>
        <span className="cover__title">{manga.title}</span>
      </div>
    </div>
  );
}

function Motif({ motif }: { motif: Manga["motif"] }) {
  switch (motif) {
    case "eclipse":
      return (
        <div className="motif">
          <div className="motif__orb" />
          <div className="motif__corona" />
        </div>
      );
    case "rift":
      return (
        <div className="motif">
          <div className="motif__rift" />
        </div>
      );
    case "tide":
      return (
        <div className="motif">
          <span className="motif__wave" style={{ top: "42%" }} />
          <span className="motif__wave" style={{ top: "56%", opacity: 0.6 }} />
          <span className="motif__wave" style={{ top: "70%", opacity: 0.35 }} />
        </div>
      );
    case "bloom":
      return (
        <div className="motif">
          <div className="motif__bloom" />
          <div className="motif__bloom motif__bloom--2" />
        </div>
      );
    case "circuit":
      return (
        <svg className="motif motif__circuit" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
          <g className="motif__circuit-lines" strokeWidth="0.5" fill="none">
            <path d="M10 30 H40 V60 H70" />
            <path d="M90 20 V50 H60 V90" />
            <path d="M20 110 H55 V80" />
            <path d="M80 120 V90 H50" />
          </g>
          <g className="motif__circuit-nodes">
            <circle cx="40" cy="60" r="1.6" />
            <circle cx="60" cy="90" r="1.6" />
            <circle cx="70" cy="60" r="1.2" />
            <circle cx="55" cy="80" r="1.2" />
          </g>
        </svg>
      );
    case "ink":
      return (
        <div className="motif">
          <div className="motif__ink" />
          <div className="motif__ink motif__ink--2" />
        </div>
      );
  }
}

export const CoverArt = memo(CoverArtImpl);
