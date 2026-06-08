// Shared types for the UI + the streaming protocol emitted by the FastAPI backend.

export type NodeId =
  | "START"
  | "contextualize"
  | "route_question"
  | "direct_answer"
  | "retrieve"
  | "grade_documents"
  | "transform_query"
  | "web_gate"
  | "web_search"
  | "answer_from_knowledge"
  | "generate"
  | "grade_generation"
  | "finalize"
  | "END";

export interface GraphNode {
  id: NodeId;
  label: string;
  position: [number, number, number];
  kind: "anchor" | "core";
  /** Visual accent: which lane / role this node belongs to. */
  accent?: "default" | "kb" | "web" | "human" | "generate" | "anchor";
  /** Shown in the click-to-inspect popup. */
  info?: { what: string; trigger: string };
}

export interface GraphEdge {
  from: NodeId;
  to: NodeId;
  conditional?: boolean;
  /** Short label shown on decision branches (e.g. "in-corpus", "approved"). */
  label?: string;
  /** Backward/retry edge — drawn with a wider arc so it doesn't overlap. */
  loop?: boolean;
  /** Optional explicit arc control [extraY, extraZ] for special edges. */
  bow?: [number, number];
}

export interface Citation {
  source: string;
  snippet: string;
  origin: string;
}

/** Per-node wall-clock latency, emitted by the backend for the perf breakdown. */
export interface NodeTiming {
  node: string;
  ms: number;
}

/** One completed turn's metrics, stored per session for the metrics viewer. */
export interface TurnMetric {
  id: string;
  question: string;
  ts: number;
  latencyMs?: number;
  timings: NodeTiming[];
  retries: number;
  steps: string[];
  route?: string;
  webSearchUsed?: boolean;
}

// ---- Server-Sent Event payloads (mirror agent.stream() in the backend) ----
export interface StartEvent {
  type: "start";
  thread_id: string;
}
export interface NodeEvent {
  type: "node";
  node: string;
  steps: string[];
}
export interface InterruptEvent {
  type: "interrupt";
  thread_id: string;
  interrupt: { type: string; message: string; question?: string };
}
export interface CompleteEvent {
  type: "complete";
  thread_id?: string;
  answer: string;
  route?: string;
  web_search_used?: boolean;
  citations?: Citation[];
  steps?: string[];
  timings?: NodeTiming[];
  retries?: number;
}
export interface ErrorEvent {
  type: "error";
  detail: string;
}
export type AgentEvent = StartEvent | NodeEvent | InterruptEvent | CompleteEvent | ErrorEvent;

// ---- UI state ----
export type AgentStatus = "idle" | "thinking" | "awaiting_approval" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  route?: string;
  webSearchUsed?: boolean;
  citations?: Citation[];
  steps?: string[];
  /** Wall-clock time from question sent to answer received (ms). */
  latencyMs?: number;
  /** Per-node server-side latency (retrieval, generation, grading, …). */
  timings?: NodeTiming[];
  /** Self-correction loops the agent ran before settling on this answer. */
  retries?: number;
}
