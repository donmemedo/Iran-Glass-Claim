"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Camera, FileCheck2, Headphones, PhoneCall, Sparkles, Wallet, Wrench } from "lucide-react";
import { api, CountUp, Reveal, spotlight, useApp } from "./providers";
import { money, nf, pct } from "./i18n";

// Model inputs (million Toman) — replace-by-default market vs. our repair-first network.
const MARKET = { repairShare: 0.15, repair: 1.5, replace: 12.5 };
const US = { repair: 1.9 + 0.4, replace: 13 + 0.4 };


function Shield() {
  const { t } = useApp();
  return (
    <div className="shield" onPointerMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 24}deg`);
    }}>
      <div className="shield-in">
        <svg viewBox="0 0 520 420" role="img" aria-label="Windshield being repaired">
          <defs>
            <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--accent-2)" stopOpacity=".55" />
              <stop offset=".55" stopColor="var(--accent)" stopOpacity=".35" />
              <stop offset="1" stopColor="var(--accent-3)" stopOpacity=".5" />
            </linearGradient>
            <linearGradient id="fr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--fg)" stopOpacity=".9" /><stop offset="1" stopColor="var(--fg)" stopOpacity=".55" />
            </linearGradient>
            <clipPath id="ws"><path d="M70 118 Q260 44 450 118 L414 322 Q260 360 106 322 Z" /></clipPath>
          </defs>
          <path d="M52 106 Q260 22 468 106 L428 338 Q260 382 92 338 Z" fill="url(#fr)" />
          <path d="M70 118 Q260 44 450 118 L414 322 Q260 360 106 322 Z" fill="url(#gl)" />
          <g clipPath="url(#ws)">
            <rect className="sweep" x="0" y="-40" width="90" height="520" fill="#fff" opacity=".35" transform="skewX(-20)" />
            <path d="M90 140 Q260 80 430 140" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" />
          </g>
          <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path className="crack" d="M318 176 l34 -22 l18 -30 M318 176 l40 16 l30 4 M318 176 l-12 40 l-20 26 M318 176 l-38 -10 l-24 -18 M318 176 l6 -44" />
          </g>
          <circle className="impact" cx="318" cy="176" r="7" fill="#fff" />
          <circle className="resin" cx="318" cy="176" r="18" fill="none" stroke="var(--accent-2)" strokeWidth="3" />
          <rect x="236" y="96" width="48" height="22" rx="6" fill="var(--fg)" opacity=".7" />
        </svg>
      </div>
      <div className="float-pill glass fp-1"><span className="dot b2"><BadgeCheck size={18} /></span><div>{t("healed")}<small>{t("repair")} · 35 min</small></div></div>
      <div className="float-pill glass fp-2"><span className="dot b1"><Wallet size={18} /></span><div>{t("zero")}<small>{t("youPay")}</small></div></div>
    </div>
  );
}

function Calculator() {
  const { t, lang } = useApp();
  const [claims, setClaims] = useState(500);
  const [share, setShare] = useState(55);
  const s = share / 100;
  const today = claims * (MARKET.repairShare * MARKET.repair + (1 - MARKET.repairShare) * MARKET.replace);
  const withUs = claims * (s * US.repair + (1 - s) * US.replace);
  const yearly = (today - withUs) * 12;
  return (
    <div className="calc glass" onPointerMove={spotlight}>
      <div className="stack">
        <label className="field"><span>{t("calcClaims")}: <b className="num">{nf(lang, claims)}</b></span>
          <input type="range" min={50} max={5000} step={50} value={claims} onChange={(e) => setClaims(+e.target.value)} /></label>
        <label className="field"><span>{t("calcRepairable")}: <b className="num">{pct(lang, share)}</b></span>
          <input type="range" min={20} max={80} value={share} onChange={(e) => setShare(+e.target.value)} /></label>
        <div>
          <div className="tiny muted">{t("calcToday")} — <b className="num">{money(lang, today)}</b> {t("perMonth")}</div>
          <div className="bar"><i style={{ width: "100%", background: "var(--fg-3)" }} /></div>
          <div className="tiny muted">{t("calcWith")} — <b className="num">{money(lang, withUs)}</b> {t("perMonth")}</div>
          <div className="bar"><i style={{ width: `${(withUs / today) * 100}%`, background: "linear-gradient(90deg,var(--accent-2),var(--accent))" }} /></div>
        </div>
      </div>
      <div style={{ alignSelf: "center" }}>
        <div className="kicker"><Sparkles size={16} />{t("calcSave")}</div>
        <div className="big-save grad num" style={{ margin: "14px 0" }}>{money(lang, yearly)}</div>
        <p className="muted" style={{ margin: 0 }}>−{pct(lang, (1 - withUs / today) * 100)} · {t("kAvg")}</p>
      </div>
    </div>
  );
}

function Demo() {
  const { t } = useApp();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  return (
    <div className="demo glass" onPointerMove={spotlight}>
      <div>
        <div className="kicker"><Headphones size={16} />{t("ctaDemo")}</div>
        <h2 className="h2">{t("demoTitle")}</h2>
        <p className="lead">{t("demoSub")}</p>
      </div>
      {state === "ok" ? (
        <div className="center"><div className="check"><BadgeCheck size={40} /></div><p className="h3">{t("demoOk")}</p></div>
      ) : (
        <form className="form" onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
          setState("busy");
          try { await api("/demo", { method: "POST", body: JSON.stringify({ ...f, monthly_claims: +f.monthly_claims || 0 }) }); setState("ok"); }
          catch { setState("err"); }
        }}>
          <label className="field"><span>{t("company")}</span><input className="input" name="company" required minLength={2} /></label>
          <label className="field"><span>{t("contact")}</span><input className="input" name="contact" required minLength={2} autoComplete="name" /></label>
          <div className="row2">
            <label className="field"><span>{t("phone")}</span><input className="input" name="phone" required minLength={8} inputMode="tel" dir="ltr" autoComplete="tel" /></label>
            <label className="field"><span>{t("monthly")}</span><input className="input" name="monthly_claims" inputMode="numeric" dir="ltr" /></label>
          </div>
          {state === "err" && <div className="notice">{t("error")}</div>}
          <button className="btn btn-primary" disabled={state === "busy"}>{t("send")}<ArrowRight size={18} className="flip" /></button>
        </form>
      )}
    </div>
  );
}

export default function Home() {
  const { t, lang } = useApp();
  const [live, setLive] = useState({ repair_rate: 58, csat: 91, avoided: 520 });
  useEffect(() => { api<typeof live>("/stats/public").then(setLive).catch(() => {}); }, []);

  const offers = [
    { i: Wrench, c: "b1", title: t("o1t"), d: t("o1d") },
    { i: Wallet, c: "b2", title: t("o2t"), d: t("o2d") },
    { i: FileCheck2, c: "b3", title: t("o3t"), d: t("o3d") },
  ];
  const steps = [[PhoneCall, "f1t", "f1d"], [Camera, "f2t", "f2d"], [Wrench, "f3t", "f3d"], [FileCheck2, "f4t", "f4d"]] as const;
  const prices = [["p1", "1.3–2.8"], ["p2", "5–28"], ["p3", "0.25–0.6"], ["p6", "+1.5"], ["p5", "30+ / " + t("perMonth")], ["p4", "35+ / " + t("perMonth")]] as const;

  return (
    <>
      <div className="wrap">
        <section className="hero">
          <div>
            <Reveal><span className="kicker"><Sparkles size={16} />{t("heroKicker")}</span></Reveal>
            <Reveal delay={80}><h1 className="h1">{t("heroTitleA")} {t("heroTitleB")}<br /><span className="grad">{t("heroTitleC")}</span></h1></Reveal>
            <Reveal delay={160}><p className="lead">{t("heroSub")}</p></Reveal>
            <Reveal delay={240}>
              <div className="hero-cta">
                <Link href="/claim" className="btn btn-primary">{t("ctaClaim")}<ArrowRight size={18} className="flip" /></Link>
                <a href="#demo" className="btn btn-ghost">{t("ctaDemo")}</a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={120}><Shield /></Reveal>
        </section>

        <Reveal>
          <div className="stats glass">
            <div><b className="grad num"><CountUp to={live.repair_rate} format={(n) => pct(lang, n)} /></b><span>{t("statRepair")}</span></div>
            <div><b className="num"><CountUp to={live.csat} format={(n) => pct(lang, n)} /></b><span>{t("statCsat")}</span></div>
            <div><b className="num"><CountUp to={10} format={(n) => "<" + nf(lang, n, 0) + "′"} /></b><span>{t("statSla")}</span></div>
            <div><b className="num"><CountUp to={live.avoided} format={(n) => money(lang, n)} /></b><span>{t("statAvoided")}</span></div>
          </div>
        </Reveal>

        <section>
          <Reveal className="center"><h2 className="h2">{t("offersTitle")}</h2><p className="lead">{t("offersSub")}</p></Reveal>
          <div className="grid3">
            {offers.map((o, i) => (
              <Reveal key={o.title} delay={i * 90}>
                <article className="card glass lift" onPointerMove={spotlight} style={{ height: "100%" }}>
                  <div className={`badge-ico ${o.c}`}><o.i size={24} /></div>
                  <h3 className="h3">{o.title}</h3><p>{o.d}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <Reveal className="center"><h2 className="h2">{t("flowTitle")}</h2></Reveal>
          <div className="grid4">
            {steps.map(([Icon, a, b], i) => (
              <Reveal key={a} delay={i * 80}>
                <div className="card glass lift" onPointerMove={spotlight} style={{ height: "100%" }}>
                  <div className="step-n num">{nf(lang, i + 1)}</div>
                  <Icon size={22} style={{ color: "var(--accent)", marginBottom: 10 }} />
                  <h3 className="h3">{t(a)}</h3><p>{t(b)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <Reveal className="center"><h2 className="h2">{t("calcTitle")}</h2><p className="lead">{t("calcSub")}</p></Reveal>
          <Reveal><Calculator /></Reveal>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="grid3" style={{ gridTemplateColumns: "1fr", maxWidth: 720, marginInline: "auto" }}>
            <Reveal className="center"><h2 className="h2">{t("pricingTitle")}</h2></Reveal>
            <Reveal>
              <div className="card glass" onPointerMove={spotlight}>
                {prices.map(([k, v]) => (
                  <div className="price" key={k}><span>{t(k)}</span><b className="num">{v.replace(/[\d.]+/g, (d) => nf(lang, +d, 2))} <small className="muted">{t("mToman")}</small></b></div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="demo" style={{ paddingTop: 0 }}><Reveal><Demo /></Reveal></section>
      </div>
      <footer>© {t("brand")} · {t("footer")}</footer>
    </>
  );
}
