import { NextResponse } from "next/server";

// BFF: live system telemetry from the FastAPI backend for the JARVIS readout.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/stats`, { cache: "no-store" });
    if (!upstream.ok) return NextResponse.json({});
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json({});
  }
}
