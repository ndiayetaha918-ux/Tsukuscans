import { Link } from "react-router-dom";
import type { Manga } from "@/lib/types";
import { Cover } from "./Cover";
import "./MangaCard.css";

export function MangaCard({
  manga,
  width,
  compat,
  showTitle = true,
}: {
  manga: Manga;
  width?: number;
  compat?: number;
  showTitle?: boolean;
}) {
  return (
    <Link
      to={`/title/${manga.id}`}
      className="mcard"
      style={width ? { width } : undefined}
      aria-label={manga.title}
    >
      <div className="mcard__poster">
        <Cover manga={manga} shape="thumb" />
        {compat != null && <span className="mcard__compat">{compat}%</span>}
      </div>
      {showTitle && (
        <div className="mcard__meta">
          <span className="mcard__title">{manga.title}</span>
          {manga.genres[0] && <span className="mcard__genre">{manga.genres[0]}</span>}
        </div>
      )}
    </Link>
  );
}
