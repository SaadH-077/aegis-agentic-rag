"use client";

import { Logo } from "./Logo";

const FEATURES = [
  { tone: "#e8323f", name: "Adaptive routing", desc: "Routes each question to the knowledge base, the live web, or a direct reply." },
  { tone: "#14151a", name: "Corrective grading", desc: "Grades retrieved docs; rewrites the query or falls back to web if weak." },
  { tone: "#b3202f", name: "Self-checking", desc: "Verifies the answer is grounded and on-topic, looping to fix itself." },
  { tone: "#3a3d49", name: "Human-in-the-loop", desc: "Pauses for your approval before it searches the web." },
  { tone: "#e8323f", name: "Persistent memory", desc: "Remembers your conversation across turns — and across visits." },
  { tone: "#5b6070", name: "Citations", desc: "Shows the sources behind every answer (docs and web)." },
];

const STACK = ["LangChain", "LangGraph", "LangSmith"];

export function InfoPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-card" onClick={(e) => e.stopPropagation()}>
        <button className="info-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="info-head">
          <Logo size={40} />
          <div>
            <h2 style={{ margin: 0 }}>Meet AEGIS</h2>
            <p style={{ margin: "2px 0 0", color: "#94a0c8", fontSize: "0.82rem" }}>
              Agentic Execution &amp; Graph-based Intelligence System
            </p>
          </div>
        </div>
        <p>
          AEGIS assembles grounded answers by routing each question to a curated AI/ML knowledge
          base or the live web, grading what it retrieves, and self-checking its answers — all
          orchestrated as a LangGraph workflow, built with LangChain and traced with LangSmith.
          The 3D graph is the agent&apos;s real workflow, lighting up live as it thinks.
        </p>

        <h3>What it can do</h3>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature" key={f.name}>
              <span className="feature__dot" style={{ background: f.tone, boxShadow: `0 0 8px ${f.tone}` }} />
              <div className="feature__name">{f.name}</div>
              <div className="feature__desc">{f.desc}</div>
            </div>
          ))}
        </div>

        <h3>How to query</h3>
        <p>
          <span className="tag tag--kb">Knowledge base</span>
          Ask about AI/ML engineering topics — transformers, RAG, LangChain, LangGraph, LangSmith,
          embeddings, agents, evaluation.
        </p>
        <div className="example-list">
          <code>What is corrective RAG?</code>
          <code>How does LangGraph handle human-in-the-loop?</code>
        </div>
        <p style={{ marginTop: 14 }}>
          <span className="tag tag--web">Live web</span>
          Ask about anything outside that scope — current events, news, people, products. AEGIS
          routes to web search and asks for your approval first.
        </p>
        <div className="example-list">
          <code>What are the latest LLM releases this month?</code>
          <code>Who is the current CEO of OpenAI?</code>
        </div>

        <h3>Controls</h3>
        <p>
          Drag to orbit · scroll to zoom · click any node to learn what it does. The camera glides
          to follow the agent; the active node glows cyan, and visited nodes stay lit in their
          stage colour.
        </p>

        <div className="arch-badges" style={{ marginTop: 18 }}>
          {STACK.map((s) => (
            <span className="badge-tech" key={s}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
