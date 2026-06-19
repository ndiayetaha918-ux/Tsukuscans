import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATALOG } from "@/data/catalog";
import { CoverArt } from "@/components/CoverArt";
import { CheckIcon, SparkIcon } from "@/components/Icons";
import { useStore, type AuthMethod } from "@/store/useStore";
import "./Onboarding.css";

const PICK_TARGET = 5;
// A diverse, art-directed subset for the taste grid.
const GRID = CATALOG;

export function Onboarding() {
  const [step, setStep] = useState<"welcome" | "taste">("welcome");
  const [auth, setAuth] = useState<AuthMethod>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const complete = useStore((s) => s.completeOnboarding);

  function choose(method: AuthMethod) {
    setAuth(method);
    setStep("taste");
  }
  function toggle(id: string) {
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 8 ? p : [...p, id]));
  }
  function finish() {
    const name = auth === "guest" ? "Invité" : auth === "google" ? "Lecteur" : "Tsukimi";
    complete(picks, auth, name);
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
            <div className="onb__moon" />
            <div className="onb__welcome-body">
              <p className="onb__kicker">tsuki scans</p>
              <h1 className="onb__h1">
                Ta prochaine lecture,<br />trouvée dans le noir.
              </h1>
              <p className="onb__lede">
                Pas un catalogue de plus. Un lecteur qui apprend ce que tu aimes
                et te tend l'œuvre suivante avant même que tu la cherches.
              </p>
              <div className="onb__auth">
                <button className="btn btn--google" onClick={() => choose("google")}>
                  <GoogleMark /> Continuer avec Google
                </button>
                <button className="btn btn--discord" onClick={() => choose("discord")}>
                  <DiscordMark /> Continuer avec Discord
                </button>
                <button className="btn btn--ghost" onClick={() => choose("guest")}>
                  Entrer en invité
                </button>
              </div>
              <p className="onb__fineprint">Aucun compte requis. L'accès au contenu est immédiat.</p>
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
            <header className="onb__taste-head safe-top">
              <div className="onb__taste-headtext">
                <h2 className="onb__h2">Choisis 5 mangas que tu aimes</h2>
                <p className="onb__taste-sub">On compose ton profil de goûts dans la seconde.</p>
              </div>
              <Counter count={picks.length} target={PICK_TARGET} />
            </header>

            <div className="onb__grid">
              {GRID.map((m) => {
                const i = picks.indexOf(m.id);
                const selected = i >= 0;
                return (
                  <button
                    key={m.id}
                    className={`onb__card${selected ? " is-selected" : ""}`}
                    onClick={() => toggle(m.id)}
                    aria-pressed={selected}
                    aria-label={m.title}
                  >
                    <CoverArt manga={m} variant="tile" />
                    <span className="onb__cardveil" />
                    <span className="onb__check">{selected ? <CheckIcon width={16} height={16} /> : null}</span>
                  </button>
                );
              })}
            </div>

            <div className="onb__cta safe-bottom">
              <button className="btn btn--primary onb__continue" disabled={picks.length < PICK_TARGET} onClick={finish}>
                <SparkIcon width={18} height={18} />
                {picks.length < PICK_TARGET
                  ? `Choisis encore ${PICK_TARGET - picks.length}`
                  : "Composer mon accueil"}
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

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
      <text x="12" y="16.2" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="var(--font-display)">G</text>
    </svg>
  );
}
function DiscordMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="#fff">
      <path d="M19.3 5.6A16 16 0 0 0 15.3 4.3l-.2.4a14 14 0 0 1 3.6 1.2 13 13 0 0 0-11.4 0A14 14 0 0 1 11 4.7l-.3-.4A16 16 0 0 0 4.7 5.6 17 17 0 0 0 2 16.4a16 16 0 0 0 4.9 2.5l.4-.8a11 11 0 0 1-1.7-.8l.4-.3a11 11 0 0 0 9.9 0l.4.3c-.5.3-1.1.6-1.7.8l.4.8a16 16 0 0 0 4.9-2.5 17 17 0 0 0-2.7-10.8ZM9.3 14.3c-.9 0-1.7-.9-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.7 1.9-1.7 1.9Zm5.4 0c-.9 0-1.7-.9-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.8 1.9-1.7 1.9Z" />
    </svg>
  );
}
