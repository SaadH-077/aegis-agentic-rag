"use client";

import { useState } from "react";

const STAGES: { c: string; name: string }[] = [
  { c: "#14151a", name: "Routing" },
  { c: "#e8323f", name: "Knowledge base" },
  { c: "#8a1f28", name: "Live web" },
  { c: "#ff2e45", name: "Human gate" },
  { c: "#3a3d49", name: "Generation" },
];

/** A small inline line sample for the connection legend. */
function Wire({ variant }: { variant: "forward" | "decision" | "retry" | "live" }) {
  const stroke = variant === "live" ? "#e8323f" : variant === "retry" ? "#a82a38" : "#3a3d49";
  const common = { stroke, strokeWidth: 2, fill: "none" } as const;
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" className="legend__wire" aria-hidden>
      {variant === "forward" && <line x1="1" y1="6" x2="23" y2="6" strokeLinecap="round" {...common} />}
      {variant === "decision" && (
        <line x1="1" y1="6" x2="23" y2="6" strokeLinecap="round" strokeDasharray="3 3" {...common} />
      )}
      {variant === "retry" && <path d="M1 6 C 6 -2, 18 -2, 23 6" strokeLinecap="round" {...common} />}
      {variant === "live" && (
        <>
          <line x1="1" y1="6" x2="23" y2="6" strokeLinecap="round" {...common} opacity={0.5} />
          <circle cx="12" cy="6" r="3" fill="#e8323f" />
        </>
      )}
    </svg>
  );
}

export function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`legend${open ? " legend--open" : ""}`}>
      <button className="legend__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="legend__toggle-mark" />
        <span className="legend__toggle-label">Legend</span>
        <span className="legend__chev">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="legend__body">
          <div className="legend__h">Traversal</div>
          <div className="legend__row">
            <span className="swatch swatch--active" /> Active
          </div>
          <div className="legend__row">
            <span className="swatch swatch--visited" /> Visited
          </div>
          <div className="legend__row">
            <span className="swatch swatch--idle" /> Idle
          </div>

          <div className="legend__h">Stages</div>
          {STAGES.map((s) => (
            <div className="legend__row" key={s.name}>
              <span className="swatch" style={{ background: s.c, boxShadow: `0 0 7px ${s.c}` }} />
              {s.name}
            </div>
          ))}

          <div className="legend__h">Connections</div>
          <div className="legend__row">
            <Wire variant="forward" /> Forward
          </div>
          <div className="legend__row">
            <Wire variant="decision" /> Decision
          </div>
          <div className="legend__row">
            <Wire variant="retry" /> Retry
          </div>
          <div className="legend__row">
            <Wire variant="live" /> Live
          </div>
        </div>
      )}
    </div>
  );
}
