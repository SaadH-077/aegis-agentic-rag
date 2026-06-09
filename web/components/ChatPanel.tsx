"use client";

import { type FormEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

import type { UseAgent } from "@/lib/useAgent";
import { ApprovalGate } from "./ApprovalGate";
import { Logo } from "./Logo";
import { Message } from "./Message";
import { MetricsPanel } from "./MetricsPanel";

const SAMPLES = [
  "What is corrective RAG?",
  "How does LangGraph handle human-in-the-loop?",
  "Explain multi-head attention.",
  "What is reranking and how does hybrid search work?",
  "When should I fine-tune instead of using RAG?",
  "Who is the current CEO of OpenAI?",
];

function relTime(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props extends UseAgent {
  onShowHelp: () => void;
  onShowPrompts: () => void;
  onOpenGraph: () => void;
  onResize: (width: number) => void;
}

const NODE_LABELS: Record<string, string> = {
  contextualize: "Contextualizing",
  route_question: "Routing",
  direct_answer: "Answering",
  retrieve: "Retrieving",
  grade_documents: "Grading docs",
  transform_query: "Rewriting query",
  web_gate: "Awaiting approval",
  web_search: "Searching the web",
  answer_from_knowledge: "Answering",
  generate: "Generating",
  grade_generation: "Self-checking",
  finalize: "Finalizing",
};

export function ChatPanel({
  messages,
  status,
  activeNode,
  pendingApproval,
  restoring,
  sessions,
  activeId,
  metrics,
  ask,
  respondApproval,
  newChat,
  selectSession,
  deleteSession,
  onShowHelp,
  onShowPrompts,
  onOpenGraph,
  onResize,
}: Props) {
  const [input, setInput] = useState("");
  const [entered, setEntered] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [metricsFor, setMetricsFor] = useState<string | null>(null);
  const [phIndex, setPhIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = status === "thinking";
  const locked = busy || !!pendingApproval;
  // Always land on the hero; only enter the chat on an explicit action.
  const inChat = entered;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pendingApproval]);

  useEffect(() => {
    if (!inChat) return;
    const t = setInterval(() => setPhIndex((i) => (i + 1) % SAMPLES.length), 3400);
    return () => clearInterval(t);
  }, [inChat]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || locked) return;
    setInput("");
    void ask(q);
  }
  // Start chatting → enter a fresh chat (the active thread is already fresh).
  const start = () => {
    setEntered(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  };
  // New chat → back to the Meet AEGIS screen with a fresh thread.
  const onNew = () => {
    setShowSessions(false);
    newChat();
    setEntered(false);
  };
  const onPick = (id: string) => {
    setShowSessions(false);
    setEntered(true);
    selectSession(id);
  };
  const onDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
  };

  // Drag the panel's left edge to resize it (desktop). Width = viewport − cursorX.
  const startResize = (e: ReactPointerEvent) => {
    e.preventDefault();
    const move = (ev: globalThis.PointerEvent) => onResize(window.innerWidth - ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const statusLabel =
    status === "thinking" ? "running" : status === "awaiting_approval" ? "paused" : status === "error" ? "error" : "ready";
  const placeholder = pendingApproval ? "respond to the approval above…" : `try: ${SAMPLES[phIndex]}`;

  return (
    <aside className="panel">
      <div
        className="panel__resize"
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat panel"
      />
      <header className="panel__head">
        <div>
          <div className="panel__brand">
            <span className="panel__logo">
              <Logo size={26} />
            </span>
            <h1 className="panel__title">AEGIS</h1>
          </div>
          <div className="panel__meta">
            <span className={`panel__live panel__live--${status}`}>{statusLabel}</span>
          </div>
        </div>
        <div className="panel__head-actions">
          {/* Mobile-only (CSS-gated): open the reasoning graph as a modal you
              control. The chat stays primary, so HITL approval is never hidden. */}
          <button className="graph-open" onClick={onOpenGraph} title="View the reasoning graph" aria-label="View the reasoning graph">
            <span className="graph-open__icon" aria-hidden>◵</span>
            Graph
          </button>
          <button className="icon-btn" onClick={() => setShowSessions((s) => !s)} title="View sessions" aria-label="View sessions">
            ⧉
          </button>
          <button className="icon-btn" onClick={onNew} title="New chat" aria-label="New chat">
            ＋
          </button>
          <button className="icon-btn" onClick={onShowPrompts} title="System prompts" aria-label="System prompts">
            ⌘
          </button>
          <button className="icon-btn" onClick={onShowHelp} title="How it works" aria-label="How it works">
            ?
          </button>
        </div>
      </header>

      {showSessions && (
        <div className="sessions">
          <div className="sessions__title">Sessions · saved across visits</div>
          <div className="sessions__list">
            {sessions.length === 0 && <div className="sessions__empty">No saved sessions yet.</div>}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`sessions__item${s.id === activeId ? " sessions__item--active" : ""}`}
                onClick={() => onPick(s.id)}
                role="button"
              >
                <span className="sessions__name">{s.title || "New chat"}</span>
                <span className="sessions__time">{relTime(s.ts)}</span>
                {(metrics[s.id]?.length ?? 0) > 0 && (
                  <button
                    className="sessions__metrics"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMetricsFor(s.id);
                    }}
                    title="View latency metrics for this chat"
                    aria-label="View metrics"
                  >
                    metrics
                  </button>
                )}
                <button
                  className="sessions__del"
                  onClick={(e) => onDelete(e, s.id)}
                  title="Delete session"
                  aria-label="Delete session"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {metricsFor && (
        <MetricsPanel
          title={sessions.find((s) => s.id === metricsFor)?.title ?? ""}
          turns={metrics[metricsFor] ?? []}
          onClose={() => setMetricsFor(null)}
        />
      )}

      <div className="panel__msgs" ref={scrollRef}>
        {restoring && messages.length === 0 && (
          <div className="restoring">
            <span className="restoring__dot" /> Restoring your conversation…
          </div>
        )}

        {!restoring && !inChat && (
          <div className="hero">
            <Logo size={60} />
            <div className="hero__title">Meet AEGIS</div>
            <div className="hero__tagline">Agentic Execution &amp; Graph-based Intelligence System</div>
            <p className="hero__desc">
              Ask anything about AI/ML engineering. AEGIS routes your question through a live
              reasoning graph — retrieving from a curated knowledge base, grading what it finds,
              self-checking its answer, and asking before it searches the web. Watch it think in
              the live graph as it works.
            </p>
            <button className="hero__cta" onClick={start}>
              Start chatting →
            </button>
          </div>
        )}

        {!restoring && inChat && messages.length === 0 && (
          <div className="starter">
            <div className="starter__memory">
              <span className="restoring__dot" /> Persistent memory — this chat is saved and
              restored on your next visit.
            </div>
            <div className="starter__label">Sample prompts</div>
            <div className="starter__chips">
              {SAMPLES.map((s) => (
                <button key={s} className="chip" onClick={() => void ask(s)} disabled={locked}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}

        {pendingApproval && (
          <ApprovalGate
            message={pendingApproval.message}
            onApprove={() => void respondApproval(true)}
            onDeny={() => void respondApproval(false)}
          />
        )}
      </div>

      {inChat && busy && (
        <div className="livebar">
          <span className="livebar__dot" />
          <span className="livebar__label">
            {activeNode ? (NODE_LABELS[activeNode] ?? activeNode) : "Reasoning"}
            <span className="livebar__ellipsis">…</span>
          </span>
          <button type="button" className="livebar__watch" onClick={onOpenGraph}>
            watch graph →
          </button>
        </div>
      )}

      {inChat && (
        <form className="panel__form" onSubmit={submit}>
          <div className="panel__inputwrap">
            <span className="panel__prompt">&gt;</span>
            <input
              ref={inputRef}
              className="panel__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={locked}
            />
          </div>
          <button className="panel__send" disabled={locked || !input.trim()} aria-label="Send">
            ➤
          </button>
        </form>
      )}
    </aside>
  );
}
