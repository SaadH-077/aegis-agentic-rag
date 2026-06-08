import { type NextRequest, NextResponse } from "next/server";

// BFF: fetch a thread's persisted conversation history from the FastAPI backend
// so a returning user's previous messages can be restored on load.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("thread_id");
  if (!threadId) {
    return NextResponse.json({ messages: [] });
  }
  try {
    const upstream = await fetch(`${BACKEND_URL}/threads/${encodeURIComponent(threadId)}/history`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json({ messages: [] });
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
