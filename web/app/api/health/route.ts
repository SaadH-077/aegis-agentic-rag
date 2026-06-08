// BFF health passthrough: lets the UI check the Python backend without exposing
// the backend URL to the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const resp = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
    return new Response(await resp.text(), {
      status: resp.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ status: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
