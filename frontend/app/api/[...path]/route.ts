// Forwards /api/* to the FastAPI backend. The browser never sees the insurer token: it is added here,
// and only for requests that carry a valid dashboard session cookie. The backend decides what needs it.
import { cookies } from "next/headers";
import { clientIp, COOKIE, readBody, sameOrigin, TOKEN, validSession } from "../auth";

const API = process.env.API_URL || "http://localhost:8000";
const PASS_REQUEST = ["content-type", "if-none-match"];
const PASS_RESPONSE = ["content-type", "etag", "cache-control", "x-total-count", "retry-after"];

async function forward(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const write = req.method !== "GET" && req.method !== "HEAD";
  if (write && !sameOrigin(req)) return Response.json({ detail: "Cross-site request blocked" }, { status: 403 });
  const { path } = await ctx.params;
  if (path.some((p) => p === "." || p === "..")) return Response.json({ detail: "Not found" }, { status: 404 });
  const body = write ? await readBody(req) : undefined;
  if (body === null) return Response.json({ detail: "Payload too large" }, { status: 413 });

  // identity: the hop is local, so gzip here would only be undone by fetch. Next compresses for the browser.
  const headers = new Headers({ "x-forwarded-for": clientIp(req.headers), "accept-encoding": "identity" });
  for (const h of PASS_REQUEST) { const v = req.headers.get(h); if (v) headers.set(h, v); }
  if (validSession((await cookies()).get(COOKIE)?.value)) headers.set("authorization", `Bearer ${TOKEN}`);

  const url = `${API}/api/${path.map(encodeURIComponent).join("/")}${new URL(req.url).search}`;
  try {
    const r = await fetch(url, { method: req.method, headers, body, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const out = new Headers();
    for (const h of PASS_RESPONSE) { const v = r.headers.get(h); if (v) out.set(h, v); }
    return new Response(r.status === 204 || r.status === 304 ? null : r.body, { status: r.status, headers: out });
  } catch {
    return Response.json({ detail: "Service unavailable" }, { status: 502 });
  }
}

export const GET = forward, POST = forward, PATCH = forward;
