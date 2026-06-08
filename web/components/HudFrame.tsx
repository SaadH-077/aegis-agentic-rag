"use client";

/** JARVIS-style HUD overlay: corner brackets, a slow scan line, and a live tag. */
export function HudFrame() {
  return (
    <div className="hud" aria-hidden>
      <span className="hud__corner hud__corner--tl" />
      <span className="hud__corner hud__corner--tr" />
      <span className="hud__corner hud__corner--bl" />
      <span className="hud__corner hud__corner--br" />
      <span className="hud__tag">AEGIS · LIVE</span>
    </div>
  );
}
