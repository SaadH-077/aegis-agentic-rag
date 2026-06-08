# Agentic RAG · the Web (Next.js + Node.js 3D UI)

The flagship UI for the Agentic RAG Assistant. The LangGraph agent **is** a
spider-web: this app renders the graph in 3D (Three.js via react-three-fiber)
and lights up each node **live** as the agent traverses it, streamed over
Server-Sent Events.

- **Next.js 14 (App Router) + TypeScript + Tailwind** — the frontend.
- **Node.js BFF** — Next.js route handlers (`app/api/*`) proxy/stream to the
  Python FastAPI backend, keeping the backend URL server-side.
- **react-three-fiber / drei / three** — the interactive 3D spider-web (orbit,
  zoom, glowing active node, travelling "web-shot" pulse along the active edge).
- **Human-in-the-loop** — when the graph interrupts for web-search approval, the
  panel shows Approve / Deny, then resumes the stream.

## Run it

Prerequisite: the Python backend running on `http://localhost:8000`
(`uvicorn agentic_rag.api.main:app` after `python -m agentic_rag.ingest`).

```bash
cd web
cp .env.local.example .env.local      # BACKEND_URL=http://localhost:8000
npm install
npm run dev                           # http://localhost:3000
```

Production build:

```bash
npm run build && npm run start
```

## How the live visualization works

1. The chat panel POSTs the question to the Node BFF route `/api/stream`.
2. The BFF forwards it to FastAPI `/stream`, which runs `agent.stream(...)` and
   emits one SSE event per LangGraph node (`route_question`, `retrieve`,
   `grade_documents`, …), then a final `complete` (or `interrupt`) event.
3. `lib/useAgent.ts` parses the SSE frames and updates `activeNode` / `visited`.
4. `components/GraphScene.tsx` highlights the corresponding 3D nodes and edges.

The graph topology in `lib/graphTopology.ts` mirrors the backend graph exactly,
so node names map straight from the stream onto the 3D scene.

## Structure

```
web/
├── app/
│   ├── page.tsx              # composition: 3D canvas + chat + status
│   ├── layout.tsx, globals.css
│   └── api/{stream,resume,health}/route.ts   # Node.js BFF
├── components/
│   ├── SpiderWebGraph.tsx    # <Canvas> scene (client-only)
│   ├── GraphScene.tsx        # nodes + edges + traversal highlight
│   ├── WebBackdrop.tsx       # decorative rotating spider-web
│   ├── ChatPanel.tsx, Message.tsx, ApprovalGate.tsx, StatusBar.tsx, Legend.tsx
└── lib/
    ├── graphTopology.ts      # 3D layout mirroring the LangGraph
    ├── useAgent.ts           # SSE streaming state machine
    └── types.ts
```
