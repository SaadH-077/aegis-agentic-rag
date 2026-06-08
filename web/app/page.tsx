"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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

const GRAPH_AUTO_KEY = "aegis_graph_auto";

export default function Home() {
  const agent = useAgent();
  const isMobile = useIsMobile();
  const [showInfo, setShowInfo] = useState(false);
  const [showArch, setShowArch] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  // Mobile graph behaviour: auto-reveal the reasoning graph while the agent
  // works, then revert to chat. The user can toggle the auto-reveal off (chat
  // only), open the graph manually, or dismiss it mid-run.
  const [graphAuto, setGraphAuto] = useState(true);
  const [manualGraph, setManualGraph] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevStatus = useRef(agent.status);

  // Show the power-up sequence once per browser session (survives hot reloads).
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem("aegis_booted")) {
      setBooting(false);
    }
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(GRAPH_AUTO_KEY);
      if (saved !== null) setGraphAuto(saved === "1");
    }
  }, []);

  // Each new run clears a previous mid-run dismissal so the graph can reveal again.
  useEffect(() => {
    if (agent.status === "thinking" && prevStatus.current !== "thinking") {
      setDismissed(false);
    }
    prevStatus.current = agent.status;
  }, [agent.status]);

  const finishBoot = () => {
    setBooting(false);
    if (typeof window !== "undefined") window.sessionStorage.setItem("aegis_booted", "1");
  };

  const toggleGraphAuto = () => {
    setGraphAuto((on) => {
      const next = !on;
      if (typeof window !== "undefined") window.localStorage.setItem(GRAPH_AUTO_KEY, next ? "1" : "0");
      return next;
    });
  };
  const openGraph = () => {
    setDismissed(false);
    setManualGraph(true);
  };
  const backToChat = () => {
    setManualGraph(false);
    setDismissed(true);
  };

  const busy = agent.status === "thinking" || agent.status === "awaiting_approval";
  const mobileGraphVisible = isMobile && !dismissed && (manualGraph || (graphAuto && busy));

  return (
    <main className={`stage${mobileGraphVisible ? " stage--mobile-graph" : ""}`}>
      {booting && <BootScreen onDone={finishBoot} />}

      <div className="stage__canvas">
        <SpiderWebGraph
          visited={agent.visited}
          activeNode={agent.activeNode}
          onSelect={setSelectedNode}
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

      {isMobile && (
        <MobileGraph status={agent.status} activeNode={agent.activeNode} onBack={backToChat} />
      )}

      <ChatPanel
        {...agent}
        onShowHelp={() => setShowInfo(true)}
        onShowPrompts={() => setShowPrompts(true)}
        graphAuto={graphAuto}
        onToggleGraphAuto={toggleGraphAuto}
        onOpenGraph={openGraph}
      />

      <InfoPanel open={showInfo} onClose={() => setShowInfo(false)} />
      <ArchitecturePanel open={showArch} onClose={() => setShowArch(false)} />
      <PromptsPanel open={showPrompts} onClose={() => setShowPrompts(false)} />
    </main>
  );
}
