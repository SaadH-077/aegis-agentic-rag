"use client";

import { NODE_BY_ID } from "@/lib/graphTopology";

/** Floating card describing a node the user clicked in the 3D graph. */
export function NodeInfoPanel({ nodeId, onClose }: { nodeId: string | null; onClose: () => void }) {
  if (!nodeId) return null;
  const node = NODE_BY_ID[nodeId];
  if (!node?.info) return null;

  return (
    <div className="nodeinfo animate-fade-in">
      <button className="nodeinfo__close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <div className="nodeinfo__name">{node.label}</div>
      <div className="nodeinfo__what">{node.info.what}</div>
      <div className="nodeinfo__triggerlabel">When it runs</div>
      <div className="nodeinfo__trigger">{node.info.trigger}</div>
    </div>
  );
}
