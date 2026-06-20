import type { Manga } from "@/lib/types";
import { MangaCard } from "./MangaCard";
import { PosterSkeletons } from "./Skeleton";
import { compatibility, type Taste } from "@/lib/recommend";
import "./Rail.css";

export function Rail({
  title,
  subtitle,
  items,
  loading,
  taste,
  width = 138,
  showCompat = false,
  variant = "standard",
}: {
  title: string;
  subtitle?: string;
  items?: Manga[];
  loading?: boolean;
  taste?: Taste;
  width?: number;
  showCompat?: boolean;
  variant?: "standard" | "big";
}) {
  if (!loading && (!items || items.length === 0)) return null;
  return (
    <section className={`rail rail--${variant}`}>
      <header className="rail__head">
        <h2 className="rail__title">{title}</h2>
        {subtitle && <p className="rail__sub">{subtitle}</p>}
      </header>
      <div className="rail__track no-scrollbar">
        {loading || !items ? (
          <PosterSkeletons count={6} width={width} />
        ) : (
          items.map((m) => (
            <MangaCard
              key={m.id}
              manga={m}
              width={width}
              compat={showCompat && taste ? compatibility(m, taste) : undefined}
            />
          ))
        )}
      </div>
    </section>
  );
}
