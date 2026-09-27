"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Star } from "lucide-react";
import { api, useApp } from "../providers";
import { local, money } from "../i18n";
import { Timeline, type Claim } from "../claims";

function Track() {
  const { t, lang } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("code") || "");
  const [c, setC] = useState<Claim | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "404">("idle");

  const find = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setState("busy");
    try { setC(await api<Claim>(`/claims/${encodeURIComponent(q.trim())}`)); setState("idle"); router.replace(`/track?code=${q.trim().toUpperCase()}`); }
    catch { setC(null); setState("404"); }
  }, [router]);
  useEffect(() => { const q = params.get("code"); if (q) find(q); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sample = async () => {
    const list = await api<Claim[]>("/claims?status=done").catch(() => []);
    if (list[0]) { setCode(list[0].code); find(list[0].code); }
  };
  const rate = async (r: number) => c && setC(await api<Claim>(`/claims/${c.code}/rating`, { method: "POST", body: JSON.stringify({ rating: r }) }));

  return (
    <div className="wrap page-head" style={{ maxWidth: 720 }}>
      <div className="center">
        <h1 className="h2">{t("trackTitle")}</h1>
        <p className="lead">{t("trackSub")}</p>
        <form className="track-form" onSubmit={(e) => { e.preventDefault(); find(code); }}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="IGC-123456" aria-label={t("trackSub")} />
          <button className="btn btn-primary" disabled={state === "busy"} aria-label={t("trackBtn")}><Search size={18} /></button>
        </form>
        {state === "404" && <div className="notice">{t("notFound")}</div>}
        {!c && <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={sample}>{t("tryDemo")}</button>}
      </div>
      {c && (
        <div className="card glass" style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 800 }}>{c.code}</span>
            <span className={`pill st-${c.status}`}>{t(c.status)}</span>
          </div>
          <dl className="kv">
            <dt>{t("s1")}</dt><dd>{t(c.glass)}</dd>
            <dt>{t("colDecision")}</dt><dd>{t(c.decision)}</dd>
            <dt>{t("insurer")}</dt><dd>{local(lang, c.insurer)}</dd>
            <dt>{t("youPay")}</dt><dd style={{ color: "var(--good)" }}>{t("zero")}</dd>
            <dt>{t("insurerPays")}</dt><dd className="num">{money(lang, c.total)}</dd>
          </dl>
          <h3 className="h3">{t("timeline")}</h3>
          <Timeline c={c} />
          {c.status === "done" && (
            <div className="center" style={{ marginTop: 28 }}>
              <b>{c.rating ? t("thanks") : t("rateTitle")}</b>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} className={r <= (c.rating || 0) ? "on" : ""} onClick={() => rate(r)} aria-label={`${r}/5`}>
                    <Star size={30} fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense><Track /></Suspense>;
}
