"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, Star } from "lucide-react";
import { api, ApiError, useApp } from "../providers";
import { local, money } from "../i18n";
import { Timeline, type Claim } from "../claims";

function Track() {
  const { t, lang } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("code") || "");
  const [c, setC] = useState<Claim | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "404" | "err">("idle");
  const [rating, setRating] = useState<"idle" | "busy" | "err">("idle");

  const find = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setState("busy");
    try {
      setC(await api<Claim>(`/claims/${encodeURIComponent(q.trim())}`)); setState("idle");
      router.replace(`/track?code=${encodeURIComponent(q.trim().toUpperCase())}`);
    } catch (e) { setC(null); setState(e instanceof ApiError && e.status === 404 ? "404" : "err"); }
  }, [router]);
  useEffect(() => { const q = params.get("code"); if (q) find(q); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sample = async () => {
    const demo = await api<{ demo_code: string }>("/stats/public").catch(() => null);
    if (demo) { setCode(demo.demo_code); find(demo.demo_code); } else setState("err");
  };
  const rate = async (r: number) => {
    if (!c || rating === "busy") return;
    setRating("busy");
    try { setC(await api<Claim>(`/claims/${encodeURIComponent(c.code)}/rating`, { method: "POST", body: JSON.stringify({ rating: r }) })); setRating("idle"); }
    catch { setRating("err"); }
  };

  return (
    <div className="wrap page-head" style={{ maxWidth: 720 }}>
      <div className="center">
        <h1 className="h2">{t("trackTitle")}</h1>
        <p className="lead">{t("trackSub")}</p>
        <form className="track-form" onSubmit={(e) => { e.preventDefault(); find(code); }}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="IGC-7KQ2M9XA" autoCapitalize="characters" spellCheck={false} aria-label={t("trackSub")} />
          <button className="btn btn-primary" disabled={state === "busy"} aria-label={t("trackBtn")} aria-busy={state === "busy"}>
            {state === "busy" ? <LoaderCircle size={18} className="spin" /> : <Search size={18} />}
          </button>
        </form>
        {state === "404" && <div className="notice" role="alert">{t("notFound")}</div>}
        {state === "err" && <div className="notice" role="alert">{t("error")}</div>}
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
                  <button key={r} className={r <= (c.rating || 0) ? "on" : ""} onClick={() => rate(r)} aria-label={`${r}/5`}
                    disabled={c.rating !== null || rating === "busy"} aria-pressed={r <= (c.rating || 0)}>
                    <Star size={30} fill="currentColor" />
                  </button>
                ))}
              </div>
              {rating === "err" && <div className="notice" role="alert">{t("error")}</div>}
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
