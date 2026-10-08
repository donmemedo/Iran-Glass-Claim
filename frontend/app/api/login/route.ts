import { cookies } from "next/headers";
import { checkPassword, clientIp, configured, COOKIE, isHttps, lockedOut, newSession, readBody, recordFailure, sameOrigin, tooManyTries } from "../auth";

const fail = (status: number, detail: string, headers?: HeadersInit) => Response.json({ detail }, { status, headers });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked");
  if (!configured()) return fail(503, "Dashboard login is not configured");
  if (tooManyTries(clientIp(req.headers)) || lockedOut()) return fail(429, "Too many attempts", { "Retry-After": "60" });
  const body = await readBody(req, 1024);
  let password: unknown;
  try { password = body && JSON.parse(new TextDecoder().decode(body)).password; } catch { /* bad JSON = wrong password */ }
  if (typeof password !== "string" || !checkPassword(password)) { recordFailure(); return fail(401, "Wrong password"); }
  const s = newSession();
  (await cookies()).set(COOKIE, s.value, { httpOnly: true, sameSite: "strict", secure: isHttps(req), path: "/", maxAge: s.maxAge });
  return new Response(null, { status: 204 });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked");
  (await cookies()).delete(COOKIE);
  return new Response(null, { status: 204 });
}
