import { useState } from "react";
import type { Manga } from "@/lib/types";
import { hueFor } from "@/lib/mangadex";
import "./Cover.css";

type Shape = "poster" | "thumb" | "hero";

/* Real cover image with a deterministic gradient placeholder underneath, so
   the layout never shows a broken image and titles without art still feel
   intentional. `hero` renders a 16:9 cinematic frame: the cover, plus a
   blurred copy of itself filling the wide space behind. */
export function Cover({ manga, shape = "poster", priority }: { manga: Manga; shape?: Shape; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const hue = hueFor(manga.id);
  const src = shape === "thumb" ? manga.coverThumb : manga.coverUrl;
  const showImg = src && !failed;

  if (shape === "hero") {
    return (
      <div className="cv cv--hero" style={{ ["--cv-hue" as string]: hue }}>
        <div className="cv__placeholder" />
        {showImg && (
          <>
            <img className="cv__heroblur" src={src} alt="" aria-hidden="true" loading="lazy" />
            <img
              className={`cv__heroimg${loaded ? " is-on" : ""}`}
              src={src}
              alt={manga.title}
              loading={priority ? "eager" : "lazy"}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`cv cv--${shape}`} style={{ ["--cv-hue" as string]: hue }}>
      <div className="cv__placeholder" />
      {showImg && (
        <img
          className={`cv__img${loaded ? " is-on" : ""}`}
          src={src}
          alt={manga.title}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {!showImg && <span className="cv__fallback">{manga.title}</span>}
    </div>
  );
}
