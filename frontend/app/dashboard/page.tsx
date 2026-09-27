"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Download, RefreshCw, X } from "lucide-react";
import { api, spotlight, useApp } from "../providers";
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

function Sheet({ c, onClose, onChange }: { c: Claim; onClose: () => void; onChange: (s: Status) => void }) {
  const { t, lang } = useApp();
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(matchMedia("(max-width: 760px)").matches); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  const next = FLOW[FLOW.indexOf(c.status) + 1];
  const side = lang === "fa" ? "-110%" : "110%";
  return (
    <>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="sheet glass" role="dialog" aria-modal="true" aria-label={t("details")}
        initial={mobile ? { y: "100%" } : { x: side }} animate={mobile ? { y: 0 } : { x: 0 }} exit={mobile ? { y: "100%" } : { x: side }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
        drag={mobile ? "y" : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.8 }}
        // Project the flick forward (Apple's momentum rule) so a quick swipe dismisses even if short.
        onDragEnd={(_, i) => i.offset.y + i.velocity.y * 0.2 > 140 && onClose()}>
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
        {next && c.status !== "rejected" && (
          <div className="hero-cta" style={{ marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => onChange(next)}>{t("advance")}: {t(next)}<ArrowRight size={18} className="flip" /></button>
            <button className="btn btn-ghost btn-danger" onClick={() => onChange("rejected")}>{t("reject")}</button>
          </div>
        )}
      </motion.aside>
    </>
  );
}

export default function Dashboard() {
  const { t, lang } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Claim | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api<Stats>("/stats"), api<Claim[]>("/claims")]);
      setStats(s); setClaims(c); setOffline(false);
    } catch { setOffline(true); }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return claims.filter((c) => (filter === "all" || c.status === filter) && (!s || `${c.code} ${c.name} ${c.plate} ${c.policy_no} ${local(lang, c.insurer)}`.toLowerCase().includes(s)));
  }, [claims, filter, q, lang]);

  const change = async (s: Status) => {
    if (!open) return;
    const c = await api<Claim>(`/claims/${open.code}`, { method: "PATCH", body: JSON.stringify({ status: s }) });
    setOpen(c); load();
  };

  const exportCsv = () => {
    const head = ["code", "insurer", "policy_no", "plate", "glass", "decision", "status", "amount_m_toman", "created_at"];
    const body = rows.map((c) => [c.code, c.insurer, c.policy_no, c.plate, c.glass, c.decision, c.status, c.total, c.created_at].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head.join(","), ...body].join("\n")], { type: "text/csv" }));
    a.download = "settlement.csv"; a.click();
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

  return (
    <div className="wrap">
      <div className="dash-head">
        <div>
          <h1 className="h2" style={{ margin: 0 }}>{t("dashTitle")}</h1>
          <p className="muted" style={{ margin: 0 }}>{t("dashSub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" onClick={load} aria-label="Refresh"><RefreshCw size={18} /></button>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Download size={16} />{t("exportCsv")}</button>
        </div>
      </div>
      {offline && <div className="notice">{t("offline")}</div>}

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
              <tr key={c.code} onClick={() => setOpen(c)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(c)}>
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
      </div>

      <AnimatePresence>{open && <Sheet key="sheet" c={open} onClose={() => setOpen(null)} onChange={change} />}</AnimatePresence>
    </div>
  );
}
