import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { buildTaste } from "@/lib/recommend";
import { LayersIcon, SparkIcon, CheckIcon } from "@/components/Icons";
import "./Profile.css";

export function Profile() {
  const displayName = useStore((s) => s.displayName);
  const auth = useStore((s) => s.auth);
  const favorites = useStore((s) => s.favorites);
  const finished = useStore((s) => s.finished);
  const progress = useStore((s) => s.progress);
  const reader = useStore((s) => s.reader);
  const picks = useStore((s) => s.picks);
  const resetAll = useStore((s) => s.resetAll);

  const taste = useMemo(() => buildTaste(picks, favorites), [picks, favorites]);
  const topGenres = useMemo(
    () => taste.topGenres.map((g) => [g, taste.weights[g] ?? 0] as const).filter(([, w]) => w > 0).slice(0, 5),
    [taste],
  );
  const maxW = topGenres[0]?.[1] ?? 1;
  const reading = Object.keys(progress).filter((id) => !finished.includes(id)).length;

  const stats = [
    { label: "Favoris", value: favorites.length },
    { label: "En cours", value: reading },
    { label: "Terminés", value: finished.length },
  ];

  return (
    <div className="profile page">
      <header className="profile__hero">
        <div className="profile__avatar">{(displayName ?? "T").slice(0, 1).toUpperCase()}</div>
        <h1 className="profile__name">{displayName ?? "Tsukimi"}</h1>
        <span className="profile__auth">{auth === "google" ? "Connecté avec Google" : auth === "discord" ? "Connecté avec Discord" : "Session invité"}</span>
      </header>

      <div className="profile__stats">
        {stats.map((s) => (
          <div key={s.label} className="profile__stat">
            <span className="profile__statval">{s.value}</span>
            <span className="profile__statlabel">{s.label}</span>
          </div>
        ))}
      </div>

      <section className="profile__section">
        <h2 className="profile__h2"><SparkIcon width={17} height={17} /> Ton empreinte de lecture</h2>
        {topGenres.length ? (
          <div className="taste">
            {topGenres.map(([g, w]) => (
              <div key={g} className="taste__row">
                <span className="taste__label">{g}</span>
                <span className="taste__bar"><span style={{ width: `${(w / maxW) * 100}%` }} /></span>
              </div>
            ))}
          </div>
        ) : (
          <p className="profile__muted">Choisis quelques œuvres : ton profil de goûts s'affinera ici.</p>
        )}
        <p className="profile__hint">Lecture : <strong>{readerModeLabel(reader.mode)}</strong> · Auto-scroll {reader.autoSpeed}×{reader.smartAuto ? " · intelligent" : ""}</p>
      </section>

      <section className="profile__section">
        <h2 className="profile__h2"><LayersIcon width={17} height={17} /> Source du catalogue</h2>
        <p className="profile__muted profile__sub">Tsuki lit en direct depuis MangaDex, une source ouverte de l'écosystème Tachiyomi/Keiyoushi. Vraies œuvres, vraies couvertures, mises à jour en continu.</p>
        <div className="repo repo--local">
          <div className="repo__main">
            <span className="repo__name">MangaDex <span className="repo__badge">Active</span></span>
            <span className="repo__url">api.mangadex.org · multilingue</span>
          </div>
          <span className="repo__locked"><CheckIcon width={16} height={16} /></span>
        </div>
      </section>

      <section className="profile__section">
        <h2 className="profile__h2">Compte</h2>
        <button className="profile__danger" onClick={() => { if (confirm("Réinitialiser ton profil et tes goûts ?")) resetAll(); }}>
          Réinitialiser le profil et recommencer l'onboarding
        </button>
      </section>
    </div>
  );
}

function readerModeLabel(m: string) {
  return m === "vertical" ? "Vertical" : m === "paged" ? "Page à page" : "Double page";
}
