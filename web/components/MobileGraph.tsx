"use client";

import type { AgentStatus } from "@/lib/types";

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle — tap a node to inspect it",
  thinking: "Reasoning live…",
  awaiting_approval: "Paused — approve in chat",
  error: "Error",
};

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
 * Mobile graph modal chrome. The shared 3D canvas is promoted to a full-screen
 * overlay underneath (via `.stage--mobile-graph`); this draws the title bar,
 * live status, a close button, and the navigation hint on top. It's fully
 * user-controlled — opening it never blocks the chat or the HITL approval.
 */
export function MobileGraph({
  status,
  activeNode,
  onClose,
}: {
  status: AgentStatus;
  activeNode: string | null;
  onClose: () => void;
}) {
  return (
    <div className="mgraph">
      <div className="mgraph__bar">
        <span className="mgraph__title">
          <span className={`statusbar__dot statusbar__dot--${status}`} />
          Reasoning graph
        </span>
        <button className="mgraph__close" onClick={onClose} aria-label="Close graph and return to chat">
          ✕ Done
        </button>
      </div>

      <div className="mgraph__foot">
        <span className="mgraph__status">
          {STATUS_LABEL[status]}
          {activeNode && <b> → {NODE_LABELS[activeNode] ?? activeNode}</b>}
        </span>
        <span className="mgraph__hint">one finger rotate · two fingers pan · pinch zoom</span>
      </div>
    </div>
  );
}
