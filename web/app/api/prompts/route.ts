import { NextResponse } from "next/server";

// BFF: the agent's real system prompts (persona + grounding rules), surfaced
// from the FastAPI backend for the in-app transparency viewer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/prompts`, { cache: "no-store" });
    if (!upstream.ok) return NextResponse.json({ prompts: [] });
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json({ prompts: [] });
  }
}
