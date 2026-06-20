import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { listPopular } from "@/lib/mangadex";
import { useAsync } from "@/lib/useAsync";
import { Cover } from "@/components/Cover";
import { LogoMark } from "@/components/Logo";
import { CheckIcon, SparkIcon } from "@/components/Icons";
import { useStore, type AuthMethod } from "@/store/useStore";
import type { Manga, TasteSeed } from "@/lib/types";
import "./Onboarding.css";

const PICK_TARGET = 5;

export function Onboarding() {
  const [step, setStep] = useState<"welcome" | "taste">("welcome");
  const [auth, setAuth] = useState<AuthMethod>(null);
  const [picks, setPicks] = useState<Manga[]>([]);
  const complete = useStore((s) => s.completeOnboarding);

  const { data, loading, error } = useAsync("onboarding-popular", () => listPopular(40));
  const titles = data ?? [];

  function choose(method: AuthMethod) {
    setAuth(method);
    setStep("taste");
  }
  function toggle(m: Manga) {
    setPicks((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : p.length >= 8 ? p : [...p, m]));
  }
  function finish() {
    const seeds: TasteSeed[] = picks.map((m) => ({
      id: m.id, title: m.title, coverThumb: m.coverThumb, genres: m.genres, tags: m.tags,
    }));
    const name = auth === "guest" ? "Invité" : auth === "google" ? "Lecteur" : "Tsukimi";
    complete(seeds, auth, name);
  }

  return (
    <div className="onb">
      <AnimatePresence mode="wait">
        {step === "welcome" ? (
          <motion.section
            key="welcome"
            className="onb__welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="onb__montage" aria-hidden="true">
              {titles.slice(0, 24).map((m, i) => (
                <div className="onb__montage-cell" key={m.id} style={{ animationDelay: `${i * 40}ms` }}>
                  <Cover manga={m} shape="thumb" />
                </div>
              ))}
            </div>
            <div className="onb__welcome-scrim" />
            <div className="onb__welcome-body">
              <LogoMark size={44} />
              <h1 className="onb__h1">Ta prochaine lecture,<br />trouvée dans le noir.</h1>
              <p className="onb__lede">
                Des milliers d'œuvres réelles. Un lecteur qui apprend tes goûts et te
                tend la suivante avant même que tu la cherches.
              </p>
              <div className="onb__auth">
                <button className="btn btn--solid" onClick={() => choose("google")}>Continuer avec Google</button>
                <button className="btn btn--discord" onClick={() => choose("discord")}>Continuer avec Discord</button>
                <button className="btn btn--ghost" onClick={() => choose("guest")}>Entrer en invité</button>
              </div>
              <p className="onb__fineprint">Aucun compte requis. Accès immédiat.</p>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="taste"
            className="onb__taste"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="onb__taste-head">
              <div>
                <h2 className="onb__h2">Choisis 5 œuvres que tu aimes</h2>
                <p className="onb__taste-sub">On compose ton accueil dans la seconde.</p>
              </div>
              <Counter count={picks.length} target={PICK_TARGET} />
            </header>

            {error ? (
              <div className="onb__error">
                <p>Connexion à la bibliothèque impossible pour l'instant.</p>
                <button className="btn btn--ghost" onClick={() => location.reload()}>Réessayer</button>
              </div>
            ) : (
              <div className="onb__grid">
                {loading
                  ? Array.from({ length: 18 }).map((_, i) => <div key={i} className="onb__card onb__card--skel" />)
                  : titles.map((m) => {
                      const selected = picks.some((x) => x.id === m.id);
                      return (
                        <button
                          key={m.id}
                          className={`onb__card${selected ? " is-selected" : ""}`}
                          onClick={() => toggle(m)}
                          aria-pressed={selected}
                          aria-label={m.title}
                        >
                          <Cover manga={m} shape="thumb" />
                          <span className="onb__cardveil" />
                          <span className="onb__check">{selected ? <CheckIcon width={16} height={16} /> : null}</span>
                        </button>
                      );
                    })}
              </div>
            )}

            <div className="onb__cta">
              <button className="btn btn--primary onb__continue" disabled={picks.length < PICK_TARGET} onClick={finish}>
                <SparkIcon width={18} height={18} />
                {picks.length < PICK_TARGET ? `Choisis encore ${PICK_TARGET - picks.length}` : "Composer mon accueil"}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function Counter({ count, target }: { count: number; target: number }) {
  return (
    <div className="onb__counter" role="status">
      {Array.from({ length: target }).map((_, i) => (
        <span key={i} className={`onb__pip${i < count ? " is-on" : ""}`} />
      ))}
      <span className="onb__counternum">{Math.min(count, target)}/{target}</span>
    </div>
  );
}
