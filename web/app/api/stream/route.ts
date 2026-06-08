import type { NextRequest } from "next/server";

// Node.js runtime: this route is the BFF that proxies the SSE stream from the
// Python FastAPI backend to the browser (keeping the backend URL server-side).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow long-running streams (and a cold backend's first wake-up) before the
// platform kills the function. Vercel caps this per plan; it's clamped if lower.
export const maxDuration = 60;

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const upstream = await fetch(`${BACKEND_URL}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!upstream.ok || !upstream.body) {
      const frame = `data: ${JSON.stringify({ type: "error", detail: `backend HTTP ${upstream.status}` })}\n\n`;
      return new Response(frame, { status: 200, headers: sseHeaders() });
    }

    // Pipe the upstream SSE stream straight through to the client.
    return new Response(upstream.body, { headers: sseHeaders() });
  } catch (err) {
    const frame = `data: ${JSON.stringify({ type: "error", detail: `cannot reach backend: ${String(err)}` })}\n\n`;
    return new Response(frame, { status: 200, headers: sseHeaders() });
  }
}
