"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Monitor, Moon, ScanSearch, ShieldPlus, Sun } from "lucide-react";
import { useApp } from "./providers";
import type { Key } from "./i18n";

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" /><stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path d="M5 9c7-4 15-4 22 0l-3 14c-5 2-11 2-16 0L5 9z" fill="url(#lg)" />
      <path d="M9 11c4-2 10-2 14 0" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M12 17l3 3 6-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LINKS: [string, Key, Key, typeof Home][] = [
  ["/", "navHome", "navHome", Home],
  ["/claim", "navClaim", "navClaim", ShieldPlus],
  ["/track", "navTrack", "navTrack", ScanSearch],
  ["/dashboard", "navDash", "navDashShort", LayoutDashboard],
];
const THEMES = { system: Monitor, light: Sun, dark: Moon } as const;
const NEXT_THEME = { system: "light", light: "dark", dark: "system" } as const;

export function Nav() {
  const { t, lang, setLang, theme, setTheme } = useApp();
  const path = usePathname();
  const ThemeIcon = THEMES[theme];
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;
  return (
    <>
      <header className="topnav glass">
        <Link href="/" className="logo" aria-label={t("brand")}><Logo /><span>{t("brand")}</span></Link>
        <nav className="links">
          {LINKS.map(([href, k]) => <Link key={href} href={href} aria-current={current(href)}>{t(k)}</Link>)}
        </nav>
        <div className="tools">
          <button className="icon-btn lang" onClick={() => setLang(lang === "fa" ? "en" : "fa")} aria-label="Language">
            {lang === "fa" ? "EN" : "فا"}
          </button>
          <button className="icon-btn" onClick={() => setTheme(NEXT_THEME[theme])} aria-label={`${t("theme")}: ${t(theme)}`} title={`${t("theme")}: ${t(theme)}`}>
            <ThemeIcon size={18} />
          </button>
          <Link href="/claim" className="btn btn-primary btn-sm">{t("ctaClaim")}</Link>
        </div>
      </header>
      <nav className="tabbar glass" aria-label="Tabs">
        {LINKS.map(([href, , short, Icon]) => (
          <Link key={href} href={href} aria-current={current(href)}><Icon size={22} strokeWidth={1.8} />{t(short)}</Link>
        ))}
      </nav>
    </>
  );
}
