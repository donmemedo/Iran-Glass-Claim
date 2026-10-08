// Server-only helpers shared by the API proxy and the dashboard login.
import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN = process.env.INSURER_TOKEN || "";
const PASSWORD = process.env.DASHBOARD_PASSWORD || "";
export const COOKIE = "igc_session";
const TTL = 12 * 3600;

// Keyed on both secrets, so rotating either one signs everybody out.
const sign = (v: string) => createHmac("sha256", `${TOKEN}\0${PASSWORD}`).update(v).digest("base64url");
const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const configured = () => Boolean(TOKEN && PASSWORD);
// Comparing HMACs keeps both sides the same length, so the check leaks neither content nor length.
export const checkPassword = (p: string) => configured() && same(sign(p), sign(PASSWORD));

export function newSession() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  return { value: `${exp}.${sign(exp)}`, maxAge: TTL };
}

export function validSession(v?: string) {
  if (!v || !configured()) return false;
  const [exp, sig] = v.split(".");
  return Boolean(exp && sig) && same(sig, sign(exp)) && Number(exp) > Date.now() / 1000;
}

// Next keeps a client-sent X-Forwarded-For (it only fills it in when absent), so without a reverse proxy the
// value is attacker-chosen. TRUST_PROXY=1 means one sits in front and appends the real peer: take the right-most
// hop. Otherwise the left-most value is a best-effort key; the spoof-proof guard is the global login cap below.
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
export const clientIp = (h: Headers) => {
  const hops = (h.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return (TRUST_PROXY ? hops.at(-1) : hops[0]) || "unknown";
};

export const isHttps = (req: Request) => new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

/** Blocks cross-site writes: browsers always send Sec-Fetch-Site or Origin on them. */
export function sameOrigin(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (!origin) return true; // not a browser request
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}

/** Reads at most `limit` bytes; returns null when the body is larger, even if it is chunked. */
export async function readBody(req: Request, limit = 64 * 1024): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(req.headers.get("content-length") || 0) > limit) return null;
  const out = new Uint8Array(new ArrayBuffer(limit));
  let size = 0;
  const reader = req.body?.getReader();
  for (;;) {
    const chunk = reader && (await reader.read());
    if (!chunk || chunk.done) return out.slice(0, size);
    if (size + chunk.value.byteLength > limit) { await reader.cancel(); return null; }
    out.set(chunk.value, size);
    size += chunk.value.byteLength;
  }
}

// One shared password, so cap failures globally too: rotating IPs can't buy more than 30 guesses a minute.
// Trade-off: a flood locks the login form (not existing sessions) for up to a minute.
const failures: number[] = [];
export const recordFailure = () => { failures.push(Date.now()); };
export function lockedOut() {
  const now = Date.now();
  while (failures.length && now - failures[0] > 60_000) failures.shift();
  return failures.length >= 30;
}

const tries = new Map<string, number[]>();
/** 10 login attempts per minute per IP. */
export function tooManyTries(ip: string) {
  const now = Date.now();
  const recent = (tries.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  if (tries.size > 10_000) tries.clear(); // ponytail: crude memory bound
  tries.set(ip, recent);
  return recent.length > 10;
}
