import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { buildTaste } from "@/lib/recommend";
import { LayersIcon, SparkIcon, CheckIcon, CloseIcon } from "@/components/Icons";
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

      <GatewaySection />

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

type GwState = { kind: "idle" | "testing" | "ok" | "err"; msg?: string };

/* Reading gateway: paste the URL of a deployed Tsuku gateway. With it, real
   French scans load reliably (the gateway fetches them server-side). Without
   it, integrated reading is best-effort and may be blocked by your network. */
function GatewaySection() {
  const gatewayUrl = useStore((s) => s.gatewayUrl);
  const setGateway = useStore((s) => s.setGateway);
  const [url, setUrl] = useState(gatewayUrl);
  const [st, setSt] = useState<GwState>({ kind: "idle" });

  async function test(u: string) {
    const base = u.trim().replace(/\/+$/, "");
    if (!base) { setSt({ kind: "err", msg: "Entre une URL" }); return; }
    setSt({ kind: "testing" });
    try {
      const h = await fetch(`${base}/`).then((r) => r.json());
      if (!h?.ok) throw new Error("réponse inattendue");
      const s = await fetch(`${base}/md/manga?limit=1`).then((r) => r.json()).catch(() => null);
      const works = s && (s.data || s.result);
      setSt({ kind: "ok", msg: works ? "Passerelle OK — MangaDex joignable, lecture activée" : "Passerelle joignable" });
      setGateway(base);
    } catch (e) {
      setSt({ kind: "err", msg: "Injoignable — vérifie l'URL et le déploiement" });
    }
  }

  return (
    <section className="profile__section">
      <h2 className="profile__h2"><LayersIcon width={17} height={17} /> Catalogue complet</h2>
      <p className="profile__muted profile__sub">
        Le cache hors-ligne ne couvre que quelques dizaines de titres. Pour lire
        <strong> tout le catalogue FR à la demande</strong>, déploie une fois ta petite
        passerelle Cloudflare gratuite (les sources bloquent les appels directs du
        navigateur — c'est inévitable). ~2&nbsp;min, sans code :
      </p>
      <ol className="gw__steps">
        <li>Ouvre <a href="https://dash.cloudflare.com/?to=/:account/workers-and-pages/create" target="_blank" rel="noopener noreferrer">Cloudflare → Create Worker ↗</a> (compte gratuit), puis <strong>Deploy</strong>.</li>
        <li><strong>Edit code</strong> : colle <a href="https://raw.githubusercontent.com/ndiayetaha918-ux/Tsukuscans/claude/tsuki-scans-pwa-nirbqo/gateway/worker.mjs" target="_blank" rel="noopener noreferrer">ce fichier (worker.mjs) ↗</a>, puis <strong>Deploy</strong>.</li>
        <li>Copie l'URL <code>…workers.dev</code>, colle-la ci-dessous, teste.</li>
      </ol>
      <div className="gw">
        <input
          className="gw__input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tsuku-gateway.xxx.workers.dev"
          aria-label="URL de la passerelle"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
        />
        <button className="btn btn--primary gw__test" onClick={() => test(url)} disabled={st.kind === "testing"}>
          {st.kind === "testing" ? "Test…" : "Tester & enregistrer"}
        </button>
      </div>
      {st.kind === "ok" && <p className="gw__status gw__status--ok"><CheckIcon width={15} height={15} /> {st.msg}</p>}
      {st.kind === "err" && <p className="gw__status gw__status--err"><CloseIcon width={15} height={15} /> {st.msg}</p>}
      {gatewayUrl && st.kind === "idle" && <p className="gw__status gw__status--ok"><CheckIcon width={15} height={15} /> Catalogue complet actif : {gatewayUrl}</p>}
      <a className="gw__guide" href="https://github.com/ndiayetaha918-ux/Tsukuscans/blob/claude/tsuki-scans-pwa-nirbqo/gateway/README.md" target="_blank" rel="noopener noreferrer">
        Autres options (Deno, Node, CLI) & détails ↗
      </a>
    </section>
  );
}
