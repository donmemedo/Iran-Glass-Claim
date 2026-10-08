"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { Key, Lang, translate } from "./i18n";

type Theme = "light" | "dark" | "system";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; t: (k: Key) => string };
const C = createContext<Ctx>(null!);
export const useApp = () => useContext(C);

const save = (k: string, v: string) =>
  (document.cookie = `${k}=${v};path=/;max-age=31536000;samesite=lax${location.protocol === "https:" ? ";secure" : ""}`);

export function Providers({ lang: l0, theme: t0, children }: { lang: Lang; theme: string; children: React.ReactNode }) {
  const [lang, setL] = useState<Lang>(l0);
  const [theme, setT] = useState<Theme>(t0 as Theme);
  const setLang = useCallback((l: Lang) => {
    save("lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "fa" ? "rtl" : "ltr";
    setL(l);
  }, []);
  const setTheme = useCallback((t: Theme) => {
    save("theme", t);
    const root = document.documentElement;
    // Cross-fade the whole page between themes where supported.
    const apply = () => { root.dataset.theme = t; setT(t); };
    "startViewTransition" in document && !matchMedia("(prefers-reduced-motion: reduce)").matches ? document.startViewTransition(apply) : apply();
  }, []);
  const t = useCallback((k: Key) => translate(lang, k), [lang]);
  // reducedMotion="user": springs and slides turn into fades when the OS asks for reduced motion.
  return <C.Provider value={{ lang, setLang, theme, setTheme, t }}><MotionConfig reducedMotion="user">{children}</MotionConfig></C.Provider>;
}

/** Fades + lifts children in once they scroll into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (el.classList.add("in"), io.disconnect()), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/** Counts up to `to` when visible. Writes the text node directly: no React render per frame. */
export function CountUp({ to, format }: { to: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const value = useRef(0);
  const fmt = useRef(format);
  fmt.current = format;
  // Re-format on every render (e.g. a language switch); React owns no children here, so it never overwrites this.
  useEffect(() => { ref.current!.textContent = format(value.current); });
  useEffect(() => {
    const el = ref.current!;
    const show = (n: number) => { value.current = n; el.textContent = fmt.current(n); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return show(to);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1400, 1);
        show(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref} />;
}

/** Tracks the pointer for the spotlight glow on `.glass` cards. */
export const spotlight = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
};

export class ApiError extends Error {
  status: number;
  constructor(status: number) { super(`API ${status}`); this.status = status; }
}

// ETags live here, in memory, not in the browser's disk cache: API responses are no-store because they carry
// PII. A poll of unchanged data is still a 304 with an empty body. Cleared on logout and on any 401.
const memo = new Map<string, { tag: string; body: unknown }>();
export const forget = () => memo.clear();

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const get = !init?.method || init.method === "GET";
  const hit = get ? memo.get(path) : undefined;
  const headers: Record<string, string> = {};
  if (init?.body) headers["Content-Type"] = "application/json";
  if (hit) headers["If-None-Match"] = hit.tag;
  const r = await fetch(`/api${path}`, { ...init, headers, cache: "no-store" });
  if (r.status === 304 && hit) return hit.body as T;
  if (!r.ok) {
    if (r.status === 401) forget();
    throw new ApiError(r.status);
  }
  const body = r.status === 204 ? undefined : await r.json();
  const tag = r.headers.get("etag");
  if (get && tag) memo.set(path, { tag, body });
  return body as T;
}
