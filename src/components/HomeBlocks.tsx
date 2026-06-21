import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { Manga } from "@/lib/types";
import type { Block } from "@/lib/compose";
import { useStore } from "@/store/useStore";
import { Cover } from "./Cover";
import { Rail } from "./Rail";
import { PlayIcon, PlusIcon, CheckIcon, ChevronRight } from "./Icons";
import "./HomeBlocks.css";

export function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case "hero": return <HeroBlock manga={block.manga} reason={block.reason} />;
    case "continue": return <ContinueBlock items={block.items} />;
    case "tall": return <TallBlock items={block.items} />;
    case "feature": return <FeatureBlock manga={block.manga} reason={block.reason} />;
    case "mosaic": return <MosaicBlock title={block.title} items={block.items} />;
    case "collection": return <CollectionBlock title={block.title} items={block.items} />;
    case "discovery": return <DiscoveryBlock items={block.items} />;
    case "spotlight": return <SpotlightBlock manga={block.manga} reason={block.reason} />;
    case "rail": return <Rail title={block.title} subtitle={block.subtitle} items={block.items} width={block.big ? 150 : 128} variant={block.big ? "big" : "standard"} />;
  }
}

function AddBtn({ manga }: { manga: Manga }) {
  const isFav = useStore((s) => s.isFavorite(manga.id));
  const toggle = useStore((s) => s.toggleFavorite);
  return (
    <button className={`hb__icon${isFav ? " is-on" : ""}`} onClick={() => toggle(manga)} aria-label={isFav ? "Retirer" : "Ajouter à ma liste"}>
      {isFav ? <CheckIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}
    </button>
  );
}

/* HERO — the decision. Cover bleeds out of the case; one red primary action. */
function HeroBlock({ manga, reason }: { manga: Manga; reason?: string }) {
  const setAmbient = useStore((s) => s.setAmbient);
  const progress = useStore((s) => s.progress[manga.id]);
  useEffect(() => { setAmbient(manga.color, manga.id); }, [manga.id, manga.color, setAmbient]);
  return (
    <section className="hb-hero">
      <Link to={`/title/${manga.id}`} className="hb-hero__art"><Cover manga={manga} shape="hero" priority /></Link>
      <div className="hb-hero__scrim" />
      <div className="hb-hero__poster"><Cover manga={manga} shape="poster" /></div>
      <div className="hb-hero__body">
        {reason && <span className="hb__reason">{reason}</span>}
        <h1 className="hb-hero__title">{manga.title}</h1>
        <p className="hb-hero__meta">{manga.genres.slice(0, 3).join("  ·  ")}</p>
        <div className="hb-hero__actions">
          <Link to={progress ? `/reader/${manga.id}` : `/title/${manga.id}`} className="btn btn--primary hb-hero__cta">
            <PlayIcon width={18} height={18} />{progress ? `Reprendre · ch.${progress.chapter}` : "Commencer"}
          </Link>
          <AddBtn manga={manga} />
        </div>
      </div>
    </section>
  );
}

function ContinueBlock({ items }: { items: [string, import("@/store/useStore").ProgressEntry][] }) {
  return (
    <section className="hb-cont">
      <h2 className="hb__h">On reprend ?</h2>
      <div className="hb-cont__track no-scrollbar">
        {items.map(([id, p]) => (
          <Link key={id} to={`/reader/${id}`} className="hb-cont__card">
            <div className="hb-cont__poster">
              <Cover manga={{ id, title: p.title, author: "", status: "", genres: [], tags: [], synopsis: "", coverThumb: p.coverThumb, coverUrl: p.coverThumb } as Manga} shape="thumb" />
              <span className="hb-cont__play"><PlayIcon width={16} height={16} /></span>
              <span className="hb-cont__bar"><span style={{ width: `${Math.min(100, (Number(p.chapter) || 1) * 1.2)}%` }} /></span>
            </div>
            <span className="hb-cont__t">{p.title}</span>
            <span className="hb-cont__c">ch.{p.chapter} · p.{p.page + 1}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* TALL — two/three big immersive panels, titles bleeding up. */
function TallBlock({ items }: { items: Manga[] }) {
  return (
    <section className="hb-tall">
      {items.slice(0, 3).map((m) => (
        <Link key={m.id} to={`/title/${m.id}`} className="hb-tall__card" style={{ ["--card-color" as string]: m.color ?? "" }}>
          <span className="hb__glow" aria-hidden="true" />
          <div className="hb-tall__art"><Cover manga={m} shape="thumb" /></div>
          <span className="hb-tall__title">{m.title}</span>
        </Link>
      ))}
    </section>
  );
}

/* FEATURE — one editorial work, cover bleeding, reason + action. */
function FeatureBlock({ manga, reason }: { manga: Manga; reason: string }) {
  return (
    <section className="hb-feature" style={{ ["--card-color" as string]: manga.color ?? "" }}>
      <span className="hb__glow" aria-hidden="true" />
      <Link to={`/title/${manga.id}`} className="hb-feature__art"><Cover manga={manga} shape="poster" /></Link>
      <div className="hb-feature__body">
        <span className="hb__reason">{reason}</span>
        <Link to={`/title/${manga.id}`} className="hb-feature__title">{manga.title}</Link>
        {manga.synopsis && <p className="hb-feature__syn">{manga.synopsis.slice(0, 110)}…</p>}
        <div className="hb-feature__row">
          <Link to={`/title/${manga.id}`} className="btn btn--solid hb-feature__cta"><PlayIcon width={16} height={16} /> Voir</Link>
          <AddBtn manga={manga} />
        </div>
      </div>
    </section>
  );
}

/* MOSAIC — an asymmetric "box": mixed sizes, deliberate broken grid. */
function MosaicBlock({ title, items }: { title: string; items: Manga[] }) {
  return (
    <section className="hb-mosaic">
      <h2 className="hb__h">{title}</h2>
      <div className="hb-mosaic__grid">
        {items.slice(0, 6).map((m, i) => (
          <Link key={m.id} to={`/title/${m.id}`} className={`hb-mosaic__cell hb-mosaic__cell--${i}`}>
            <Cover manga={m} shape={i === 0 ? "poster" : "thumb"} />
            {i === 0 && <span className="hb-mosaic__big">{m.title}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* COLLECTION — a themed universe as an object: partially stacked deck. */
function CollectionBlock({ title, items }: { title: string; items: Manga[] }) {
  const lead = items[0];
  return (
    <section className="hb-collection">
      <Link to={lead ? `/title/${lead.id}` : "/discover"} className="hb-collection__deck">
        {items.slice(0, 4).map((m, i) => (
          <span key={m.id} className={`hb-collection__layer hb-collection__layer--${i}`}><Cover manga={m} shape="thumb" /></span>
        ))}
        <span className="hb-collection__veil" />
        <span className="hb-collection__label">
          <span className="hb-collection__kicker">Collection</span>
          <span className="hb-collection__title">{title}</span>
          <span className="hb-collection__count">{items.length} œuvres ›</span>
        </span>
      </Link>
    </section>
  );
}

function DiscoveryBlock({ items }: { items: Manga[] }) {
  return (
    <Link to="/discover" className="hb-discovery">
      <div className="hb-discovery__peek">
        {items.slice(0, 4).map((m) => <span key={m.id} className="hb-discovery__cov"><Cover manga={m} shape="thumb" /></span>)}
      </div>
      <div className="hb-discovery__label">
        <span className="hb-discovery__t">Feed Découverte</span>
        <span className="hb-discovery__s">Une œuvre, un swipe — trouve ta prochaine lecture</span>
      </div>
      <span className="hb-discovery__go"><ChevronRight /></span>
    </Link>
  );
}

function SpotlightBlock({ manga, reason }: { manga: Manga; reason: string }) {
  return (
    <section className="hb-spot" style={{ ["--card-color" as string]: manga.color ?? "" }}>
      <span className="hb__glow" aria-hidden="true" />
      <Link to={`/title/${manga.id}`} className="hb-spot__art"><Cover manga={manga} shape="thumb" /></Link>
      <div className="hb-spot__body">
        <span className="hb__reason">{reason}</span>
        <Link to={`/title/${manga.id}`} className="hb-spot__title">{manga.title}</Link>
        <span className="hb-spot__meta">{manga.genres.slice(0, 2).join(" · ")}</span>
      </div>
      <AddBtn manga={manga} />
    </section>
  );
}
