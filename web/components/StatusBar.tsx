"use client";

import type { AgentStatus } from "@/lib/types";

const LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  thinking: "Traversing the web…",
  awaiting_approval: "Awaiting your approval",
  error: "Error",
};

export function StatusBar({
  status,
  activeNode,
}: {
  status: AgentStatus;
  activeNode: string | null;
}) {
  return (
    <div className="statusbar">
      <span className={`statusbar__dot statusbar__dot--${status}`} />
      <span>{LABELS[status]}</span>
      {activeNode && <span className="statusbar__node">→ {activeNode}</span>}
    </div>
  );
}
