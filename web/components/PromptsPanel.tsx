"use client";

import { useEffect, useState } from "react";

import { Logo } from "./Logo";

interface PromptEntry {
  id: string;
  title: string;
  role: string;
  node: string;
  text: string;
}

/**
 * Transparency viewer: shows the agent's real system prompts — the persona, the
 * anti-hallucination grounding rules, and every grader — pulled live from the
 * backend. Answers the recruiter question "do you have a system prompt, and
 * what's in it?" directly, with the source of truth.
 */
export function PromptsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prompts, setPrompts] = useState<PromptEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || prompts) return;
    let alive = true;
    fetch("/api/prompts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (Array.isArray(d.prompts) && d.prompts.length) setPrompts(d.prompts);
        else setError(true);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [open, prompts]);

  if (!open) return null;
  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-card" onClick={(e) => e.stopPropagation()}>
        <button className="info-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="info-head">
          <Logo size={40} />
          <div>
            <h2 style={{ margin: 0 }}>System Prompts &amp; Persona</h2>
            <p style={{ margin: "2px 0 0", color: "#94a0c8", fontSize: "0.82rem" }}>
              The real prompts driving every reasoning step — live from the backend
            </p>
          </div>
        </div>
        <p className="prompts__intro">
          AEGIS is not a single prompt — each graph node has its own purpose-built system
          prompt. The <b>persona</b> sets identity, the <b>generation</b> prompt enforces the
          grounding rules that suppress hallucination, and dedicated <b>graders</b> police
          relevance and groundedness. These are loaded straight from the running service.
        </p>

        {error && !prompts && (
          <p className="prompts__intro">Couldn&apos;t reach the backend to load the prompts.</p>
        )}
        {!error && !prompts && <p className="prompts__intro">Loading prompts…</p>}

        {prompts && (
          <div className="prompts__list">
            {prompts.map((p) => (
              <div className="prompt-card" key={p.id}>
                <div className="prompt-card__head">
                  <span className="prompt-card__title">{p.title}</span>
                  <span className="prompt-card__node">node: {p.node}</span>
                </div>
                <div className="prompt-card__role">{p.role}</div>
                <pre className="prompt-card__text">{p.text}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
