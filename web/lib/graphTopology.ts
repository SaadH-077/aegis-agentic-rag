// The LangGraph topology laid out as a wide, depth-aware reasoning graph,
// woven across the web that frames the scene.
//   • spine (y≈0):  START → contextualize → route → … → generate → self-check → finalize → END
//   • knowledge lane (y>0):  retrieve → grade docs        (set slightly back in z)
//   • web lane (y<0):        human gate → web search      (set slightly forward in z)
//   • direct path (forward): route → direct_answer → finalize  (greetings / identity)
//
// Coordinates are deliberately spacious and undulate in z so the graph reads
// with real depth/parallax instead of as a flat, clustered diagram. The spine
// bulges toward the camera through the middle; the two lanes sit at different
// depths so they never collide with the spine on screen.
// Node ids match the backend node names exactly so streamed events map directly.

import type { GraphEdge, GraphNode, NodeId } from "./types";

export const NODES: GraphNode[] = [
  {
    id: "START",
    label: "Start",
    position: [-16.0, 0.4, -2.6],
    kind: "anchor",
    accent: "anchor",
    info: { what: "Entry point of the workflow.", trigger: "Every question begins here." },
  },
  {
    id: "contextualize",
    label: "Contextualize",
    position: [-12.6, 0.7, -0.4],
    kind: "core",
    accent: "default",
    info: {
      what: "Rewrites your latest question into a standalone query using the conversation so far.",
      trigger: "Runs at the start of a turn when there is prior chat history.",
    },
  },
  {
    id: "route_question",
    label: "Route",
    position: [-8.9, 0.3, 1.4],
    kind: "core",
    accent: "default",
    info: {
      what: "Classifies the question and picks the path: knowledge base, live web, or a direct reply.",
      trigger: "Runs on every question.",
    },
  },
  {
    id: "direct_answer",
    label: "Direct Answer",
    position: [-5.4, -2.6, 3.2],
    kind: "core",
    accent: "generate",
    info: {
      what: "Replies directly to greetings, small talk, and questions about AEGIS — no retrieval.",
      trigger: "When you greet it or ask what it can do.",
    },
  },
  {
    id: "retrieve",
    label: "Retrieve",
    position: [-5.2, 4.8, -0.8],
    kind: "core",
    accent: "kb",
    info: {
      what: "Fetches the most relevant chunks from the FAISS vector store.",
      trigger: "When the router picks the knowledge base.",
    },
  },
  {
    id: "grade_documents",
    label: "Grade Docs",
    position: [-1.2, 5.2, 0.2],
    kind: "core",
    accent: "kb",
    info: {
      what: "Grades each retrieved chunk for relevance and discards the irrelevant ones.",
      trigger: "Right after retrieval.",
    },
  },
  {
    id: "web_gate",
    label: "Human Gate",
    position: [-5.2, -5.0, 1.2],
    kind: "core",
    accent: "human",
    info: {
      what: "Human-in-the-loop checkpoint that asks for your approval before searching the web.",
      trigger: "When the agent wants to use the web.",
    },
  },
  {
    id: "web_search",
    label: "Web Search",
    position: [-1.2, -5.2, 2.0],
    kind: "core",
    accent: "web",
    info: {
      what: "Searches the live web (Tavily or DuckDuckGo) and adds the results to the context.",
      trigger: "After you approve a web search.",
    },
  },
  {
    id: "answer_from_knowledge",
    label: "Model Answer",
    position: [3.4, -4.4, 1.4],
    kind: "core",
    accent: "generate",
    info: {
      what: "Answers from the model's own training knowledge — with a clear disclaimer — when the web is declined and the question isn't in the knowledge base.",
      trigger: "When you decline a web search for an out-of-scope question.",
    },
  },
  {
    id: "transform_query",
    label: "Rewrite Query",
    position: [-2.3, -0.4, 2.4],
    kind: "core",
    accent: "default",
    info: {
      what: "Rewrites the query to improve retrieval or web search.",
      trigger: "When retrieved docs are weak, or a self-check fails.",
    },
  },
  {
    id: "generate",
    label: "Generate",
    position: [3.6, 0.2, 2.0],
    kind: "core",
    accent: "generate",
    info: {
      what: "Writes the answer grounded only in the gathered context, with citations.",
      trigger: "Once relevant context is ready.",
    },
  },
  {
    id: "grade_generation",
    label: "Self-Check",
    position: [7.8, 0.6, 0.6],
    kind: "core",
    accent: "generate",
    info: {
      what: "Verifies the answer is grounded (no hallucination) and actually resolves your question.",
      trigger: "After generation; can loop back to fix problems.",
    },
  },
  {
    id: "finalize",
    label: "Finalize",
    position: [11.6, 0.3, -1.0],
    kind: "core",
    accent: "default",
    info: {
      what: "Commits the answer and stores it in conversation memory.",
      trigger: "When the answer passes the self-check (or retries run out).",
    },
  },
  {
    id: "END",
    label: "End",
    position: [14.6, 0.0, -2.8],
    kind: "anchor",
    accent: "anchor",
    info: { what: "The answer is returned to you.", trigger: "End of the workflow." },
  },
];

export const EDGES: GraphEdge[] = [
  { from: "START", to: "contextualize" },
  { from: "contextualize", to: "route_question" },
  { from: "route_question", to: "retrieve", conditional: true, label: "in-corpus" },
  { from: "route_question", to: "web_gate", conditional: true, label: "out-of-scope" },
  { from: "route_question", to: "direct_answer", conditional: true, label: "chit-chat" },
  { from: "retrieve", to: "grade_documents" },
  { from: "grade_documents", to: "generate", conditional: true, label: "relevant" },
  { from: "grade_documents", to: "transform_query", conditional: true, label: "weak" },
  { from: "transform_query", to: "web_gate" },
  { from: "web_gate", to: "web_search", conditional: true, label: "approved" },
  { from: "web_gate", to: "answer_from_knowledge", conditional: true, label: "declined" },
  { from: "answer_from_knowledge", to: "finalize", conditional: true, label: "from model", bow: [3.0, 1.6] },
  { from: "web_search", to: "generate" },
  { from: "direct_answer", to: "finalize", conditional: true, label: "direct", bow: [6.2, 2.8] },
  { from: "generate", to: "grade_generation" },
  { from: "grade_generation", to: "finalize", conditional: true, label: "grounded" },
  { from: "grade_generation", to: "generate", conditional: true, label: "hallucination", loop: true },
  { from: "grade_generation", to: "transform_query", conditional: true, label: "off-topic", loop: true },
  { from: "finalize", to: "END" },
];

// Flatten depth so every branch/path reads clearly at first glance — keep a hint
// of z for life, but drop the deep parallax that let distant nodes overlap.
const Z_FLATTEN = 0.45;
for (const n of NODES) n.position = [n.position[0], n.position[1], n.position[2] * Z_FLATTEN];

export const NODE_POSITIONS: Record<string, [number, number, number]> = Object.fromEntries(
  NODES.map((n) => [n.id, n.position]),
) as Record<NodeId, [number, number, number]>;

export const NODE_BY_ID: Record<string, GraphNode> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
) as Record<NodeId, GraphNode>;

export function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}
