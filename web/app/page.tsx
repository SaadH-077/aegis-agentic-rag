"use client";

import dynamic from "next/dynamic";
import { type CSSProperties, useEffect, useState } from "react";

import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { BootScreen } from "@/components/BootScreen";
import { ChatPanel } from "@/components/ChatPanel";
import { HudFrame } from "@/components/HudFrame";
import { InfoPanel } from "@/components/InfoPanel";
import { Legend } from "@/components/Legend";
import { Logo } from "@/components/Logo";
import { MobileGraph } from "@/components/MobileGraph";
import { NodeInfoPanel } from "@/components/NodeInfoPanel";
import { PromptsPanel } from "@/components/PromptsPanel";
import { StatusBar } from "@/components/StatusBar";
import { Telemetry } from "@/components/Telemetry";
import { useAgent } from "@/lib/useAgent";
import { useIsMobile } from "@/lib/useIsMobile";

// The 3D scene is client-only (Three.js cannot render on the server).
const SpiderWebGraph = dynamic(() => import("@/components/SpiderWebGraph"), {
  ssr: false,
  loading: () => <div className="web-loading">Spinning up the workflow…</div>,
});

/** Keep the chat panel between 360px and 85% of the viewport (so the graph
 *  always keeps a usable region to its left). */
function clampWidth(w: number): number {
  const max = typeof window !== "undefined" ? Math.min(960, window.innerWidth * 0.85) : 960;
  return Math.max(360, Math.min(max, Math.round(w)));
}

export default function Home() {
  const agent = useAgent();
  const isMobile = useIsMobile();
  const [showInfo, setShowInfo] = useState(false);
  const [showArch, setShowArch] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  // Mobile: the chat is the primary, always-visible surface. The reasoning graph
  // is an explicit, user-controlled modal — it never auto-hides the chat, so the
  // human-in-the-loop approval card (which lives in the chat) is always reachable.
  const [graphOpen, setGraphOpen] = useState(false);

  // Desktop: the chat panel is drag-resizable; the 3D canvas is clipped to the
  // area left of it (via the --panel-width CSS var) so the graph never overlaps
  // the chat. Width is persisted across visits.
  const [panelWidth, setPanelWidth] = useState(440);

  // Show the power-up sequence once per browser session (survives hot reloads).
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem("aegis_booted")) {
      setBooting(false);
    }
    if (typeof window !== "undefined") {
      const saved = Number(window.localStorage.getItem("aegis_panel_width"));
      if (saved) setPanelWidth(clampWidth(saved));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("aegis_panel_width", String(panelWidth));
  }, [panelWidth]);

  // Closing the graph on desktop is a no-op; leaving the breakpoint closes it.
  useEffect(() => {
    if (!isMobile) setGraphOpen(false);
  }, [isMobile]);

  const finishBoot = () => {
    setBooting(false);
    if (typeof window !== "undefined") window.sessionStorage.setItem("aegis_booted", "1");
  };

  const mobileGraphVisible = isMobile && graphOpen;

  return (
    <main
      className={`stage${mobileGraphVisible ? " stage--mobile-graph" : ""}`}
      style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
    >
      {booting && <BootScreen onDone={finishBoot} />}

      <div className="stage__canvas">
        <SpiderWebGraph
          visited={agent.visited}
          activeNode={agent.activeNode}
          onSelect={setSelectedNode}
          isMobile={isMobile}
        />
      </div>

      <HudFrame />

      <header className="topbar">
        <div className="brand">
          <Logo size={38} />
          <div>
            <div className="brand__title">AEGIS</div>
            <div className="brand__sub">
              <b>A</b>gentic <b>E</b>xecution · <b>G</b>raph-based <b>I</b>ntelligence <b>S</b>ystem
            </div>
          </div>
        </div>
        <div className="topbar__actions">
          <button className="topbar__btn" onClick={() => setShowArch(true)}>
            Architecture
          </button>
          <button className="topbar__btn" onClick={() => setShowPrompts(true)}>
            System Prompts
          </button>
          <button className="topbar__btn" onClick={() => setShowInfo(true)}>
            How it works
          </button>
        </div>
      </header>

      <Telemetry />
      <Legend />
      <StatusBar status={agent.status} activeNode={agent.activeNode} />
      <NodeInfoPanel nodeId={selectedNode} onClose={() => setSelectedNode(null)} />

      {isMobile && graphOpen && (
        <MobileGraph
          status={agent.status}
          activeNode={agent.activeNode}
          onClose={() => setGraphOpen(false)}
        />
      )}

      <ChatPanel
        {...agent}
        onShowHelp={() => setShowInfo(true)}
        onShowPrompts={() => setShowPrompts(true)}
        onOpenGraph={() => setGraphOpen(true)}
        onResize={(w) => setPanelWidth(clampWidth(w))}
      />

      <InfoPanel open={showInfo} onClose={() => setShowInfo(false)} />
      <ArchitecturePanel open={showArch} onClose={() => setShowArch(false)} />
      <PromptsPanel open={showPrompts} onClose={() => setShowPrompts(false)} />
    </main>
  );
}
