"use client";

// Request path: browser → Node BFF → FastAPI → the LangGraph agent.
const FLOW = [
  { name: "Browser", tech: "Next.js · React · react-three-fiber", role: "You ask a question; the 3D graph lights up live over SSE." },
  { name: "BFF", tech: "Next.js route handlers (Node.js)", role: "/api/stream · /resume · /history — proxies to the backend, hides its URL." },
  { name: "API", tech: "FastAPI (Python)", role: "REST + Server-Sent Events; emits one event per graph node." },
  { name: "Agent", tech: "LangGraph state machine", role: "The RAG pipeline below — stateful, cyclic, human-in-the-loop.", highlight: true },
];

// The actual RAG pipeline, step by step, naming the tech doing the work.
type Stage = { n: string; step: string; detail: string; tech: string; branch?: string[]; loop?: boolean };
const PIPELINE: Stage[] = [
  { n: "01", step: "Contextualize", detail: "Rewrites your question to be standalone using the chat history.", tech: "LangChain" },
  { n: "02", step: "Route", detail: "Classifies the query and splits into three paths:", tech: "LangChain · Groq", branch: ["Knowledge base", "Live web", "Direct reply"] },
  { n: "03", step: "Retrieve", detail: "Embeds the query and pulls the top-k chunks from the vector store.", tech: "FAISS · MiniLM" },
  { n: "04", step: "Grade docs", detail: "Keeps only relevant chunks; if weak, rewrites and escalates to web.", tech: "Groq grader" },
  { n: "05", step: "Human gate", detail: "Pauses and waits for your approval before any web search.", tech: "LangGraph interrupt()" },
  { n: "06", step: "Web search / fallback", detail: "Approved → live web; declined → answer from the model's own knowledge.", tech: "Tavily · DuckDuckGo" },
  { n: "07", step: "Generate", detail: "Writes a grounded, cited answer from the gathered context only.", tech: "Groq · Llama 3.3 70B" },
  { n: "08", step: "Self-check", detail: "Grades groundedness + relevance; loops back to fix itself if needed.", tech: "Groq graders", loop: true },
  { n: "09", step: "Finalize", detail: "Commits the answer to persistent, per-user memory.", tech: "SqliteSaver" },
];

// Make the stack usage explicit — the visitor asked "where is each one used?"
const STACK = [
  {
    name: "LangChain",
    role: "Builds every reasoning step as an LCEL chain (prompt → model → parser). Graders return typed JSON via Pydantic output parsers.",
  },
  {
    name: "LangGraph",
    role: "Orchestrates the whole agent as a stateful, cyclic state machine — conditional routing, retry loops, human-in-the-loop interrupt(), and a SQLite checkpointer for per-user memory. The 3D graph you see IS this state machine.",
  },
    {
    name: "LangSmith",
    role: "Tracing is LIVE — every node and LLM call is recorded to the project \"agentic-rag-assistant\" (visible at smith.langchain.com), and the eval/ suite scores correctness, groundedness and relevance (LLM-as-judge).",
  },
];

const TOOLS = [
  { name: "Groq", role: "LLM — Llama 3.3 70B" },
  { name: "FAISS", role: "Vector store" },
  { name: "Hugging Face", role: "MiniLM embeddings" },
  { name: "Tavily · DDG", role: "Live web search" },
  { name: "SQLite", role: "Persistent memory" },
  { name: "LangSmith", role: "Tracing + eval" },
];

export function ArchitecturePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-card" onClick={(e) => e.stopPropagation()}>
        <button className="info-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>System Architecture</h2>
        <p>
          How a question flows through AEGIS — from the browser, through a Node.js
          backend-for-frontend, into the Python LangGraph agent and its tools, with LangSmith
          tracing the entire run.
        </p>

        <h3>Request path</h3>
        <div className="arch">
          {FLOW.map((l, i) => (
            <div key={l.name} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className={`arch-layer${l.highlight ? " arch-layer--star" : ""}`}>
                <div className="arch-layer__name">{l.name}</div>
                <div className="arch-layer__tech">{l.tech}</div>
                <div className="arch-layer__role">{l.role}</div>
              </div>
              {i < FLOW.length - 1 && <div className="arch-arrow">↓</div>}
            </div>
          ))}
        </div>

        <h3>The RAG pipeline</h3>
        <div className="pipeline">
          {PIPELINE.map((p) => (
            <div className="pl-stage" key={p.step}>
              <span className="pl-dot">{p.n}</span>
              <div className="pl-card">
                <div className="pl-head">
                  <span className="pl-name">
                    {p.step}
                    {p.loop && <span className="pl-loop">⟲ loops</span>}
                  </span>
                  <span className="pl-tech">{p.tech}</span>
                </div>
                <div className="pl-detail">{p.detail}</div>
                {p.branch && (
                  <div className="pl-branch">
                    {p.branch.map((b) => (
                      <span className="pl-chip" key={b}>
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <h3>How LangChain · LangGraph · LangSmith are used</h3>
        <div className="stackcards">
          {STACK.map((s) => (
            <div className="stackcard" key={s.name}>
              <div className="stackcard__name">{s.name}</div>
              <div className="stackcard__role">{s.role}</div>
            </div>
          ))}
        </div>

        <h3>Models &amp; tools</h3>
        <div className="arch-tools">
          {TOOLS.map((t) => (
            <div className="arch-tool" key={t.name}>
              <div className="arch-tool__name">{t.name}</div>
              <div className="arch-tool__role">{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
