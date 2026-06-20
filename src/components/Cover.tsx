import { useState } from "react";
import type { Manga } from "@/lib/types";
import { hueFor } from "@/lib/anilist";
import "./Cover.css";

type Shape = "poster" | "thumb" | "hero";

/* Real cover/banner imagery with a deterministic placeholder underneath, so the
   layout never shows a broken image. `hero` prefers AniList's wide bannerImage
   (true 16:9 art); otherwise it builds a cinematic frame from the cover with a
   blurred backfill. Placeholders use the cover's own dominant colour. */
export function Cover({ manga, shape = "poster", priority }: { manga: Manga; shape?: Shape; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const hue = hueFor(manga.id);
  const placeholderStyle = {
    ["--cv-hue" as string]: hue,
    ...(manga.color ? { ["--cv-color" as string]: manga.color } : {}),
  } as React.CSSProperties;

  if (shape === "hero") {
    const heroSrc = manga.banner || manga.coverUrl;
    const showImg = heroSrc && !failed;
    return (
      <div className={`cv cv--hero${manga.banner ? " cv--banner" : ""}`} style={placeholderStyle}>
        <div className={`cv__placeholder${manga.color ? " cv__placeholder--solid" : ""}`} />
        {showImg && (
          <>
            <img className="cv__heroblur" src={manga.coverUrl || heroSrc} alt="" aria-hidden="true" loading="lazy" />
            <img
              className={`cv__heroimg${loaded ? " is-on" : ""}`}
              src={heroSrc}
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

  const src = shape === "thumb" ? manga.coverThumb || manga.coverUrl : manga.coverUrl || manga.coverThumb;
  const showImg = src && !failed;
  return (
    <div className={`cv cv--${shape}`} style={placeholderStyle}>
      <div className={`cv__placeholder${manga.color ? " cv__placeholder--solid" : ""}`} />
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
