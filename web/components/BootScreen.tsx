"use client";

import { useCallback, useEffect, useState } from "react";

import { Logo } from "./Logo";

const STEPS = [
  "initializing graph runtime",
  "loading knowledge base · FAISS",
  "embedding 68 chunks · MiniLM",
  "linking Groq inference · llama-3.3-70b",
  "attaching LangSmith tracing",
  "weaving reasoning web",
  "calibrating self-check loops",
];

const STEP_MS = 950; // ~8s total power-up so the brand reads before the app loads

/** Full-screen "powering up" sequence shown on first load — sets a professional first impression. */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [closing, setClosing] = useState(false);

  const finish = useCallback(() => {
    setClosing(true);
    window.setTimeout(onDone, 600); // let the fade play out
  }, [onDone]);

  useEffect(() => {
    const timers: number[] = [];
    STEPS.forEach((_, i) => timers.push(window.setTimeout(() => setStep(i + 1), STEP_MS * (i + 1))));
    timers.push(window.setTimeout(() => setDone(true), STEP_MS * STEPS.length + 250));
    timers.push(window.setTimeout(finish, STEP_MS * STEPS.length + 1100));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [finish]);

  const progress = done ? 100 : Math.round((step / STEPS.length) * 100);

  return (
    <div className={`boot${closing ? " boot--closing" : ""}`} onClick={finish} role="button" aria-label="Skip intro">
      <div className="boot__scan" />
      <div className="boot__grid" />
      <div className="boot__inner">
        <div className="boot__logo">
          <Logo size={88} />
        </div>
        <div className="boot__name">AEGIS</div>
        <div className="boot__expand">
          <b>A</b>gentic <b>E</b>xecution &amp; <b>G</b>raph-based <b>I</b>ntelligence <b>S</b>ystem
        </div>

        <div className="boot__bar">
          <div className="boot__bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="boot__log">
          {STEPS.slice(0, step).map((s) => (
            <div key={s} className="boot__line">
              <span className="boot__ok">✓</span> {s}
            </div>
          ))}
          {done ? (
            <div className="boot__online">◢ AEGIS ONLINE ◣</div>
          ) : (
            <div className="boot__status">
              POWERING UP<span className="boot__cursor" />
            </div>
          )}
        </div>

        <div className="boot__skip">click anywhere to skip</div>
      </div>
    </div>
  );
}
