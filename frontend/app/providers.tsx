"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Key, Lang, translate } from "./i18n";

type Theme = "light" | "dark" | "system";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; t: (k: Key) => string };
const C = createContext<Ctx>(null!);
export const useApp = () => useContext(C);

const save = (k: string, v: string) => (document.cookie = `${k}=${v};path=/;max-age=31536000;samesite=lax`);

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
  return <C.Provider value={{ lang, setLang, theme, setTheme, t }}>{children}</C.Provider>;
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

/** Counts up to `to` when visible. */
export function CountUp({ to, format }: { to: number; format: (n: number) => string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1400, 1);
        setN(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(ref.current!);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{format(n)}</span>;
}

/** Tracks the pointer for the spotlight glow on `.glass` cards. */
export const spotlight = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
