import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { buildProfile } from "@/lib/recommend";
import { fetchRepository, summarizeRepository } from "@/lib/sources";
import type { RepositoryManifest } from "@/lib/types";
import { LayersIcon, PlusIcon, CloseIcon, CheckIcon, SparkIcon } from "@/components/Icons";
import "./Profile.css";

export function Profile() {
  const displayName = useStore((s) => s.displayName);
  const auth = useStore((s) => s.auth);
  const favorites = useStore((s) => s.favorites);
  const finished = useStore((s) => s.finished);
  const progress = useStore((s) => s.progress);
  const downloads = useStore((s) => s.downloads);
  const reader = useStore((s) => s.reader);
  const signal = useStore((s) => s.behaviorSignal());
  const resetAll = useStore((s) => s.resetAll);

  const taste = useMemo(() => buildProfile(signal), [signal]);
  const topGenres = useMemo(
    () =>
      Object.entries(taste.genres)
        .filter(([, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [taste],
  );
  const maxW = topGenres[0]?.[1] ?? 1;

  const readingCount = Object.keys(progress).filter((id) => !finished.includes(id)).length;
  const downloadCount = Object.values(downloads).reduce((n, arr) => n + arr.length, 0);

  const stats = [
    { label: "Favoris", value: favorites.length },
    { label: "En cours", value: readingCount },
    { label: "Terminés", value: finished.length },
    { label: "Hors-ligne", value: downloadCount },
  ];

  return (
    <div className="profile page">
      <header className="profile__hero">
        <div className="profile__avatar">{(displayName ?? "T").slice(0, 1).toUpperCase()}</div>
        <h1 className="profile__name">{displayName ?? "Tsukimi"}</h1>
        <span className="profile__auth">
          {auth === "google" ? "Connecté avec Google" : auth === "discord" ? "Connecté avec Discord" : "Session invité"}
        </span>
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
          <p className="profile__muted">Lis quelques chapitres : ton profil de goûts s'affinera ici.</p>
        )}
        <p className="profile__hint">
          Mode de lecture actuel : <strong>{readerModeLabel(reader.mode)}</strong> · Auto-scroll {reader.autoSpeed}×
          {reader.smartAuto ? " · intelligent" : ""}
        </p>
      </section>

      <SourcesManager />

      <section className="profile__section">
        <h2 className="profile__h2">Compte</h2>
        <button className="profile__danger" onClick={() => { if (confirm("Réinitialiser ton profil, ta progression et tes goûts ?")) resetAll(); }}>
          Réinitialiser le profil et recommencer l'onboarding
        </button>
      </section>
    </div>
  );
}

function readerModeLabel(m: string) {
  return m === "vertical" ? "Vertical" : m === "paged" ? "Page à page" : "Double page";
}

/* The modular repository system, surfaced. Repositories are data; the
   Keiyoushi index is fetched live to prove the connector layer is real. */
function SourcesManager() {
  const repositories = useStore((s) => s.repositories);
  const toggleRepository = useStore((s) => s.toggleRepository);
  const removeRepository = useStore((s) => s.removeRepository);
  const addRepository = useStore((s) => s.addRepository);

  const [manifests, setManifests] = useState<Record<string, RepositoryManifest | "loading" | { error: string }>>({});
  const [newUrl, setNewUrl] = useState("");

  async function test(repo: { id: string; name: string; url: string }) {
    setManifests((m) => ({ ...m, [repo.id]: "loading" }));
    try {
      const manifest = await fetchRepository(repo, { allowNsfw: false });
      setManifests((m) => ({ ...m, [repo.id]: manifest }));
    } catch (e) {
      setManifests((m) => ({ ...m, [repo.id]: { error: (e as Error).message } }));
    }
  }

  function add() {
    const url = newUrl.trim();
    if (!url) return;
    let host = "Dépôt";
    try { host = new URL(url).hostname; } catch { /* keep default */ }
    addRepository({ id: `repo-${Date.now()}`, name: host, url, enabled: true });
    setNewUrl("");
  }

  return (
    <section className="profile__section">
      <h2 className="profile__h2"><LayersIcon width={17} height={17} /> Sources & dépôts</h2>
      <p className="profile__muted profile__sub">
        Le catalogue est modulaire : ajoute, active ou remplace des dépôts compatibles Keiyoushi.
        La sélection Tsuki reste disponible hors-ligne en permanence.
      </p>

      <ul className="repos">
        <li className="repo repo--local">
          <div className="repo__main">
            <span className="repo__name">Tsuki — Sélection <span className="repo__badge">Local</span></span>
            <span className="repo__url">Catalogue intégré · disponible hors-ligne</span>
          </div>
          <span className="repo__locked"><CheckIcon width={16} height={16} /></span>
        </li>

        {repositories.map((repo) => {
          const state = manifests[repo.id];
          return (
            <li key={repo.id} className="repo">
              <div className="repo__main">
                <span className="repo__name">{repo.name}</span>
                <span className="repo__url">{repo.url}</span>
                {state === "loading" && <span className="repo__status">Connexion au dépôt…</span>}
                {state && state !== "loading" && "error" in state && (
                  <span className="repo__status repo__status--err">{state.error}</span>
                )}
                {state && state !== "loading" && "sources" in state && (
                  <RepoSummary manifest={state} />
                )}
              </div>
              <div className="repo__actions">
                <button className="repo__test" onClick={() => test(repo)}>Tester</button>
                <button
                  className={`switch switch--sm${repo.enabled ? " is-on" : ""}`}
                  onClick={() => toggleRepository(repo.id)}
                  aria-label={repo.enabled ? "Désactiver" : "Activer"}
                ><span /></button>
                <button className="repo__remove" onClick={() => removeRepository(repo.id)} aria-label="Retirer le dépôt">
                  <CloseIcon width={16} height={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="repo__add">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://…/index.min.json"
          aria-label="URL d'un dépôt"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn btn--ghost" onClick={add}><PlusIcon width={16} height={16} /> Ajouter</button>
      </div>
    </section>
  );
}

function RepoSummary({ manifest }: { manifest: RepositoryManifest }) {
  const { total, topLangs } = summarizeRepository(manifest);
  return (
    <div className="repo__summary">
      <span className="repo__count">{total.toLocaleString("fr-FR")} sources détectées</span>
      <div className="repo__langs">
        {topLangs.map(([lang, n]) => (
          <span key={lang} className="repo__lang">{lang} · {n}</span>
        ))}
      </div>
    </div>
  );
}
