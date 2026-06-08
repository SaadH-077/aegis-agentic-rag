"use client";

import { useEffect, useState } from "react";

interface Stats {
  llm_provider?: string;
  llm_model?: string;
  embeddings_model?: string;
  kb_docs?: number;
  vectors?: number;
  langsmith?: string;
  retriever_k?: number;
  max_retries?: number;
}

/** JARVIS-style live system readout — shows this is a real, instrumented system. */
export function Telemetry() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setS(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!s || !s.llm_provider) return null;

  const rows: [string, string][] = [
    ["model", s.llm_model ?? s.llm_provider],
    ["kb", `${s.kb_docs ?? "—"} docs`],
    ["index", `${s.vectors ?? "—"} vectors`],
    ["embed", (s.embeddings_model ?? "").split("/").pop() ?? "—"],
    ["top-k", `${s.retriever_k ?? "—"}`],
    ["retries", `${s.max_retries ?? "—"} max`],
    ["trace", s.langsmith === "True" ? "langsmith ●" : "off"],
  ];

  return (
    <div className="telemetry">
      <div className="telemetry__title">{"// system"}</div>
      {rows.map(([k, v]) => (
        <div className="telemetry__row" key={k}>
          <span className="telemetry__k">{k}</span>
          <span className="telemetry__v">{v}</span>
        </div>
      ))}
    </div>
  );
}
