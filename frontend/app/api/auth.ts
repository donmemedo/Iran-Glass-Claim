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

// Short secrets or the .env.example placeholder fail closed: login answers 503 until real ones are set.
// A 12+ char password, not the rate limits, is what makes guessing hopeless.
export const configured = () => TOKEN.length >= 24 && PASSWORD.length >= 12 && ![TOKEN, PASSWORD].includes("change-me");
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

// Next keeps a client-sent X-Forwarded-For (it only fills it in when absent), so the header is attacker-chosen
// unless a reverse proxy overwrites it. TRUST_PROXY=1 says one does: take its (right-most) hop. Without it there
// is no trustworthy client IP, so callers get null and per-IP limits fall back to shared/global ones.
export const TRUST_PROXY = process.env.TRUST_PROXY === "1";
export const clientIp = (h: Headers) =>
  TRUST_PROXY ? (h.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean).at(-1)?.slice(0, 45) || null : null;

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

// Global ceiling on failed logins, whatever the IP: 300/min. High enough that holding it takes a sustained
// 5 req/s flood (and existing sessions keep working), low enough to bound guessing if IPs rotate.
const failures: number[] = [];
export const recordFailure = () => { failures.push(Date.now()); };
export function lockedOut() {
  const now = Date.now();
  while (failures.length && now - failures[0] > 60_000) failures.shift();
  return failures.length >= 300;
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
