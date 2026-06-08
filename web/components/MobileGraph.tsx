"use client";

import type { AgentStatus } from "@/lib/types";

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Done — reasoning complete",
  thinking: "Reasoning through the graph…",
  awaiting_approval: "Waiting for your approval",
  error: "Something went wrong",
};

/**
 * The mobile graph overlay frame: a floating status pill, the live node, and a
 * "back to chat" button. The 3D canvas itself shows through underneath (it is
 * promoted to a full-screen overlay by the `.stage--mobile-graph` class). Auto-
 * revealed while the agent searches; dismissible any time.
 */
export function MobileGraph({
  status,
  activeNode,
  onBack,
}: {
  status: AgentStatus;
  activeNode: string | null;
  onBack: () => void;
}) {
  return (
    <div className="mgraph">
      <div className="mgraph__top">
        <span className="mgraph__status">
          <span className={`statusbar__dot statusbar__dot--${status}`} />
          {STATUS_LABEL[status]}
        </span>
        <button className="mgraph__back" onClick={onBack}>
          ← Chat
        </button>
      </div>
      {activeNode ? (
        <span className="mgraph__node">→ {activeNode}</span>
      ) : (
        <span className="mgraph__hint">drag to orbit · pinch to zoom</span>
      )}
      <span className="mgraph__hint">live agent reasoning graph</span>
    </div>
  );
}
