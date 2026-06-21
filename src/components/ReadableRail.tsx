import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { readableTitles, type ReadableTitle } from "@/lib/library";
import "./ReadableRail.css";

/* "Lisibles maintenant" — the titles the static library covers, readable with
   zero setup. Surfaced prominently so the zero-intervention reading is obvious
   instead of something you stumble onto. */
export function ReadableRail() {
  const [items, setItems] = useState<ReadableTitle[] | null>(null);

  useEffect(() => {
    let alive = true;
    readableTitles().then((t) => { if (alive) setItems(t); }).catch(() => setItems([]));
    return () => { alive = false; };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="rrail" aria-label="Lisibles maintenant">
      <header className="rrail__head">
        <h2 className="rrail__title">Lisibles maintenant</h2>
        <span className="rrail__badge">{items.length} titres · sans rien installer</span>
      </header>
      <div className="rrail__track no-scrollbar">
        {items.map((t) => (
          <Link key={t.anilist} to={`/title/${t.anilist}`} className="rrail__card">
            <div className="rrail__art">
              {t.cover ? <img src={t.cover} alt={t.title} loading="lazy" draggable={false} /> : <div className="rrail__ph" />}
              <span className="rrail__chip">FR</span>
            </div>
            <span className="rrail__name">{t.title}</span>
            <span className="rrail__meta">ch. {t.from}{t.to !== t.from ? `–${t.to}` : ""}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
