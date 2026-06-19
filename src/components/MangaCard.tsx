import { Link } from "react-router-dom";
import type { Manga } from "@/lib/types";
import { CoverArt } from "./CoverArt";
import { StarIcon } from "./Icons";
import "./MangaCard.css";

export function MangaCard({
  manga,
  width,
  showMeta = false,
  compat,
}: {
  manga: Manga;
  width?: number;
  showMeta?: boolean;
  compat?: number;
}) {
  return (
    <Link
      to={`/title/${manga.id}`}
      className="mcard"
      style={width ? { width } : undefined}
      aria-label={`${manga.title} par ${manga.author}`}
    >
      <div className="mcard__poster">
        <CoverArt manga={manga} variant="tile" />
        {compat != null && <span className="mcard__compat">{compat}%</span>}
      </div>
      {showMeta && (
        <div className="mcard__meta">
          <span className="mcard__rating">
            <StarIcon width={12} height={12} /> {manga.rating.toFixed(1)}
          </span>
          <span className="mcard__genre">{manga.genres[0]}</span>
        </div>
      )}
    </Link>
  );
}
