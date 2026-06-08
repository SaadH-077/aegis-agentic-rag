"use client";

import type { TurnMetric } from "@/lib/types";
import { Logo } from "./Logo";

const NODE_LABELS: Record<string, string> = {
  contextualize: "Contextualize",
  route_question: "Route",
  direct_answer: "Direct Answer",
  retrieve: "Retrieve",
  grade_documents: "Grade Docs",
  transform_query: "Rewrite",
  web_gate: "Human Gate",
  web_search: "Web Search",
  answer_from_knowledge: "Model Answer",
  generate: "Generate",
  grade_generation: "Self-Check",
  finalize: "Finalize",
};

/**
 * Per-session metrics viewer: every turn in a chat with its real latency —
 * total wall clock, compute, retrieval/generation split, retries, and a
 * per-node breakdown. Opened from the sessions list.
 */
export function MetricsPanel({
  title,
  turns,
  onClose,
}: {
  title: string;
  turns: TurnMetric[];
  onClose: () => void;
}) {
  const totalWall = turns.reduce((a, t) => a + (t.latencyMs ?? 0), 0);
  const avgWall = turns.length ? totalWall / turns.length : 0;

  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-card" onClick={(e) => e.stopPropagation()}>
        <button className="info-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="info-head">
          <Logo size={40} />
          <div>
            <h2 style={{ margin: 0 }}>Chat metrics</h2>
            <p style={{ margin: "2px 0 0", color: "#94a0c8", fontSize: "0.82rem" }}>{title || "New chat"}</p>
          </div>
        </div>

        {turns.length === 0 ? (
          <p className="prompts__intro">No measured turns in this chat yet.</p>
        ) : (
          <>
            <p className="prompts__intro">
              {turns.length} {turns.length === 1 ? "turn" : "turns"} · avg{" "}
              <b>{(avgWall / 1000).toFixed(2)}s</b> wall clock. Each turn below shows where the
              time actually went — node by node, including the retrieval and generation split.
            </p>
            <div className="metrics__list">
              {turns.map((t, idx) => (
                <TurnCard key={t.id} turn={t} index={idx + 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TurnCard({ turn, index }: { turn: TurnMetric; index: number }) {
  const byNode = new Map<string, number>();
  for (const x of turn.timings) byNode.set(x.node, (byNode.get(x.node) ?? 0) + x.ms);
  const rows = [...byNode.entries()].sort((a, b) => b[1] - a[1]);
  const compute = rows.reduce((acc, [, ms]) => acc + ms, 0);
  const peak = rows.length ? rows[0][1] : 1;
  const retrieveMs = byNode.get("retrieve");
  const generateMs = byNode.get("generate");

  return (
    <div className="turn-card">
      <div className="turn-card__head">
        <span className="turn-card__q">
          <span className="turn-card__n">{index}</span>
          {turn.question || "(question)"}
        </span>
        {turn.route && <span className="prompt-card__node">{turn.route}</span>}
      </div>
      <div className="perf__grid">
        <Stat k="wall clock" v={typeof turn.latencyMs === "number" ? `${(turn.latencyMs / 1000).toFixed(2)}s` : "—"} />
        <Stat k="compute" v={`${(compute / 1000).toFixed(2)}s`} />
        <Stat k="retrieval" v={typeof retrieveMs === "number" ? `${Math.round(retrieveMs)}ms` : "—"} />
        <Stat k="generation" v={typeof generateMs === "number" ? `${Math.round(generateMs)}ms` : "—"} />
        <Stat k="nodes" v={`${turn.timings.length}`} />
        <Stat k="retries" v={`${turn.retries ?? 0}`} />
      </div>
      <div className="perf__bars">
        {rows.map(([node, ms]) => (
          <div className="perf__bar" key={node}>
            <span className="perf__label">{NODE_LABELS[node] ?? node}</span>
            <span className="perf__track">
              <span className="perf__fill" style={{ width: `${Math.max(4, (ms / peak) * 100)}%` }} />
            </span>
            <span className="perf__ms">{Math.round(ms)}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="perf__stat">
      <span className="perf__k">{k}</span>
      <span className="perf__v">{v}</span>
    </div>
  );
}
