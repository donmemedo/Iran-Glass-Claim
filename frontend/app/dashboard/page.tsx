"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Download, LockKeyhole, LogOut, RefreshCw, X } from "lucide-react";
import { api, ApiError, spotlight, useApp } from "../providers";
import { df, local, money, nf, pct } from "../i18n";
import { FLOW, Timeline, type Claim, type Status } from "../claims";

type Stats = {
  total: number; open: number; repair_rate: number; avg_cost: number; avoided: number; billed: number; csat: number; sla: number;
  daily: number[]; by_glass: Record<Claim["glass"], number>; by_status: Record<Status, number>;
};
const STATUS_COLOR: Record<Status, string> = {
  received: "var(--fg-3)", approved: "var(--accent)", scheduled: "var(--accent-3)", in_service: "var(--warn)", done: "var(--good)", rejected: "var(--bad)",
};
const FILTERS: (Status | "all")[] = ["all", ...FLOW, "rejected"];

function Donut({ data }: { data: Record<Status, number> }) {
  const { t, lang } = useApp();
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 42 42" aria-hidden>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line)" strokeWidth="6" />
        {(Object.keys(data) as Status[]).map((s) => {
          const v = (data[s] / total) * 100;
          const el = <circle key={s} cx="21" cy="21" r="15.9" fill="none" stroke={STATUS_COLOR[s]} strokeWidth="6" strokeDasharray={`${v} ${100 - v}`} strokeDashoffset={-acc} pathLength={100} />;
          acc += v;
          return el;
        })}
      </svg>
      <div className="legend">
        {(Object.keys(data) as Status[]).map((s) => <span key={s} style={{ color: STATUS_COLOR[s] }}><i /><span style={{ color: "var(--fg-2)" }}>{t(s)} · {nf(lang, data[s])}</span></span>)}
      </div>
    </div>
  );
}

// Apple's momentum projection (Designing Fluid Interfaces): where a flick would come to rest.
const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);
const SPRING = { type: "spring", bounce: 0, duration: 0.4 } as const; // critically damped: opening isn't a flick

function Sheet({ c, busy, failed, onClose, onChange }: {
  c: Claim; busy: boolean; failed: boolean; onClose: () => void; onChange: (s: Status) => void;
}) {
  const { t, lang } = useApp();
  const ref = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setMobile(matchMedia("(max-width: 760px)").matches); }, []);
  useEffect(() => setConfirm(false), [c.status]);
  useEffect(() => {
    // Modal focus: move in, trap Tab, give focus back to the row that opened it.
    const back = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const f = ref.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input");
      const first = f[0], last = f[f.length - 1], at = document.activeElement;
      if (e.shiftKey && (at === first || at === ref.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first?.focus(); }
    };
    addEventListener("keydown", key);
    return () => { removeEventListener("keydown", key); back?.focus(); };
  }, [onClose]);
  const next = FLOW[FLOW.indexOf(c.status) + 1];
  const side = lang === "fa" ? "-110%" : "110%";
  return (
    <>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside ref={ref} tabIndex={-1} className="sheet glass" role="dialog" aria-modal="true" aria-label={t("details")}
        initial={mobile ? { y: "100%" } : { x: side }} animate={mobile ? { y: 0 } : { x: 0 }} exit={mobile ? { y: "100%" } : { x: side }}
        transition={SPRING}
        drag={mobile ? "y" : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.8 }}
        // Dismiss if the projected resting point is past half the sheet, so a short fast flick still closes it.
        onDragEnd={(_, i) => i.offset.y + project(i.velocity.y) > (ref.current?.offsetHeight ?? 600) / 2 && onClose()}>
        <div className="grabber" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 18, fontWeight: 800 }}>{c.code}</span>
          <button className="icon-btn" onClick={onClose} aria-label={t("close")}><X size={18} /></button>
        </div>
        <span className={`pill st-${c.status}`} style={{ marginTop: 10 }}>{t(c.status)}</span>
        <dl className="kv">
          <dt>{t("colDriver")}</dt><dd>{c.name}</dd>
          <dt>{t("plate")}</dt><dd className="mono">{c.plate}</dd>
          <dt>{t("policy")}</dt><dd className="mono">{c.policy_no}</dd>
          <dt>{t("insurer")}</dt><dd>{local(lang, c.insurer)}</dd>
          <dt>{t("s1")}</dt><dd>{t(c.glass)} · {nf(lang, c.size_cm)} {t("cm")}</dd>
          <dt>{t("colDecision")}</dt><dd style={{ color: c.decision === "repair" ? "var(--good)" : "var(--warn)" }}>{t(c.decision)}</dd>
          <dt>{t("s4")}</dt><dd>{t(c.service === "mobile" ? "mobileTeam" : "center")} · {local(lang, c.city)}</dd>
          <dt>{t("photos")}</dt><dd>{nf(lang, c.photos)} {t("photosN")}</dd>
          <dt>{t("colAmount")}</dt><dd className="num">{money(lang, c.total)}</dd>
          {c.avoided > 0 && <><dt>{t("kAvoided")}</dt><dd className="num" style={{ color: "var(--good)" }}>{money(lang, c.avoided)}</dd></>}
        </dl>
        <h3 className="h3">{t("timeline")}</h3>
        <Timeline c={c} />
        {failed && <div className="notice" role="alert">{t("changeFailed")}</div>}
        {next && c.status !== "rejected" && (confirm ? (
          // Rejection is final on the server, so it gets a confirmation (Apple: confirm only what can't be undone).
          <div className="confirm" role="alertdialog" aria-label={t("rejectAsk")}>
            <p>{t("rejectAsk")}</p>
            <div className="hero-cta" style={{ marginTop: 0 }}>
              <button className="btn btn-bad" disabled={busy} onClick={() => onChange("rejected")}>{t("reject")}</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirm(false)} autoFocus>{t("cancel")}</button>
            </div>
          </div>
        ) : (
          <div className="hero-cta" style={{ marginTop: 24 }}>
            <button className="btn btn-primary" disabled={busy} aria-busy={busy} onClick={() => onChange(next)}>{t("advance")}: {t(next)}<ArrowRight size={18} className="flip" /></button>
            <button className="btn btn-ghost btn-danger" disabled={busy} onClick={() => setConfirm(true)}>{t("reject")}</button>
          </div>
        ))}
      </motion.aside>
    </>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const { t } = useApp();
  const [state, setState] = useState<"idle" | "busy" | 401 | 429 | 503 | "err">("idle");
  const msg = { 401: t("badPassword"), 429: t("tooMany"), 503: t("loginOff"), err: t("error") } as const;
  return (
    <form className="login glass" onSubmit={async (e) => {
      e.preventDefault();
      setState("busy");
      try {
        await api("/login", { method: "POST", body: JSON.stringify({ password: new FormData(e.currentTarget).get("password") }) });
        onDone();
      } catch (x) {
        const s = x instanceof ApiError ? x.status : 0;
        setState(s === 401 || s === 429 || s === 503 ? s : "err");
      }
    }}>
      <div className="badge-ico b1"><LockKeyhole size={24} /></div>
      <h1 className="h2">{t("navDash")}</h1>
      <p className="muted" style={{ margin: 0 }}>{t("loginSub")}</p>
      <label className="field"><span>{t("password")}</span>
        <input className="input" name="password" type="password" autoComplete="current-password" required autoFocus dir="ltr"
          aria-invalid={state === 401} aria-describedby="login-err" />
        <span className="err" id="login-err" role="alert">{typeof state === "number" || state === "err" ? msg[state] : ""}</span>
      </label>
      <button className="btn btn-primary" disabled={state === "busy"} aria-busy={state === "busy"}>{t("login")}</button>
    </form>
  );
}

// Quote every cell and neutralise spreadsheet formulas (CSV injection): plate and policy number are user input.
const cell = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

export default function Dashboard() {
  const { t, lang } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Claim | null>(null);
  const [offline, setOffline] = useState(false);
  const [auth, setAuth] = useState<"unknown" | "in" | "out">("unknown");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = useCallback(() => { setOpen(null); setFailed(false); }, []);

  const load = useCallback(async () => {
    try {
      // ponytail: first 200 (the API max) newest claims, filtered client-side; move q/status server-side past that.
      const [s, c] = await Promise.all([api<Stats>("/stats"), api<Claim[]>("/claims?limit=200")]);
      setStats(s); setClaims(c); setOffline(false); setAuth("in");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuth("out");
      else setOffline(true);
    }
  }, []);
  const out = auth === "out";
  useEffect(() => {
    if (out) return;
    load();
    // Unchanged data comes back as a 304 (ETag), and hidden tabs don't poll at all.
    const id = setInterval(() => !document.hidden && load(), 15000);
    return () => clearInterval(id);
  }, [load, out]);
  const logout = async () => {
    await api("/login", { method: "DELETE" }).catch(() => {});
    setAuth("out"); setClaims([]); setStats(null); setOpen(null);
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return claims.filter((c) => (filter === "all" || c.status === filter) && (!s || `${c.code} ${c.name} ${c.plate} ${c.policy_no} ${local(lang, c.insurer)}`.toLowerCase().includes(s)));
  }, [claims, filter, q, lang]);

  const change = async (s: Status) => {
    if (!open || busy) return;
    setBusy(true); setFailed(false);
    try {
      setOpen(await api<Claim>(`/claims/${encodeURIComponent(open.code)}`, { method: "PATCH", body: JSON.stringify({ status: s }) }));
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuth("out");
      setFailed(true);
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    const head = ["code", "insurer", "policy_no", "plate", "glass", "decision", "status", "amount_m_toman", "created_at"];
    const body = rows.map((c) => [c.code, c.insurer, c.policy_no, c.plate, c.glass, c.decision, c.status, c.total, c.created_at].map(cell).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head.map(cell).join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "settlement.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href));
  };

  const max = Math.max(...(stats?.daily || [1]), 1);
  const kpis: [string, string, string?][] = stats ? [
    [t("kClaims"), nf(lang, stats.total)],
    [t("kOpen"), nf(lang, stats.open)],
    [t("kRepair"), pct(lang, stats.repair_rate), `${t("target")} ${pct(lang, 55)}`],
    [t("kAvg"), money(lang, stats.avg_cost)],
    [t("kAvoided"), money(lang, stats.avoided)],
    [t("colAmount"), money(lang, stats.billed)],
    [t("kCsat"), pct(lang, stats.csat)],
    [t("kSla"), pct(lang, stats.sla)],
  ] : [];

  if (out) return <div className="wrap"><Login onDone={() => setAuth("unknown")} /></div>;

  return (
    <div className="wrap">
      <div className="dash-head">
        <div>
          <h1 className="h2" style={{ margin: 0 }}>{t("dashTitle")}</h1>
          <p className="muted" style={{ margin: 0 }}>{t("dashSub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" onClick={load} aria-label={t("refresh")} title={t("refresh")}><RefreshCw size={18} /></button>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!rows.length}><Download size={16} />{t("exportCsv")}</button>
          <button className="icon-btn" onClick={logout} aria-label={t("logout")} title={t("logout")}><LogOut size={18} className="flip" /></button>
        </div>
      </div>
      {offline && <div className="notice" role="alert">{t("offline")}</div>}

      <div className="kpis">
        {stats ? kpis.map(([k, v, sub]) => (
          <div key={k} className="kpi glass" onPointerMove={spotlight}><span>{k}</span><b className="num">{v}</b>{sub && <small>{sub}</small>}</div>
        )) : Array.from({ length: 8 }, (_, i) => <div key={i} className="kpi glass"><div className="skeleton" style={{ height: 56 }} /></div>)}
      </div>

      {stats && (
        <div className="charts">
          <div className="chart glass">
            <b>{t("kClaims")}</b> <span className="tiny muted">· {t("last14")}</span>
            <div className="bars">{stats.daily.map((d, i) => <div key={i} title={nf(lang, d)} style={{ height: `${(d / max) * 100}%`, animationDelay: `${i * 30}ms` }} />)}</div>
          </div>
          <div className="chart glass">
            <b>{t("byGlass")}</b>
            {(Object.entries(stats.by_glass) as [Claim["glass"], number][]).map(([g, n]) => (
              <div key={g} className="hbar"><span>{t(g)}</span>
                <div className="bar"><i style={{ width: `${(n / stats.total) * 100}%`, background: "linear-gradient(90deg,var(--accent-2),var(--accent))" }} /></div>
                <span className="num">{nf(lang, n)}</span></div>
            ))}
          </div>
          <div className="chart glass"><b>{t("byStatus")}</b><Donut data={stats.by_status} /></div>
        </div>
      )}

      <div className="table-card glass">
        <div className="toolbar">
          <div className="seg-scroll">
            <div className="seg" role="group">
              {FILTERS.map((s) => <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>{t(s)}</button>)}
            </div>
          </div>
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        </div>
        <table>
          <thead><tr>{(["colCode", "colDriver", "insurer", "colGlass", "colDecision", "colAmount", "colStatus", "colDate"] as const).map((k) => <th key={k}>{t(k)}</th>)}</tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.code} onClick={() => setOpen(c)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(c); } }}>
                <td className="mono">{c.code}</td><td>{c.name}</td><td>{local(lang, c.insurer)}</td><td>{t(c.glass)}</td>
                <td style={{ color: c.decision === "repair" ? "var(--good)" : "var(--warn)", fontWeight: 600 }}>{t(c.decision)}</td>
                <td className="num">{money(lang, c.total)}</td>
                <td><span className={`pill st-${c.status}`}>{t(c.status)}</span></td>
                <td className="muted">{df(lang, c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cards-m">
          {rows.map((c) => (
            <button key={c.code} onClick={() => setOpen(c)}>
              <b>{c.name}</b><span className={`pill st-${c.status}`}>{t(c.status)}</span>
              <span className="tiny muted"><span className="mono">{c.code}</span> · {t(c.glass)} · {local(lang, c.insurer)}</span>
              <span className="tiny num">{money(lang, c.total)}</span>
            </button>
          ))}
        </div>
        {!rows.length && stats && <p className="center muted" style={{ padding: 32 }}>{t("empty")}</p>}
        {stats && claims.length < stats.total && (
          <p className="center tiny muted" style={{ padding: 16 }}>
            {t("shownOf").replace("{n}", nf(lang, claims.length, 0)).replace("{m}", nf(lang, stats.total, 0))}
          </p>
        )}
      </div>

      <AnimatePresence>{open && <Sheet key="sheet" c={open} busy={busy} failed={failed} onClose={close} onChange={change} />}</AnimatePresence>
    </div>
  );
}
