"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Camera, Check, Copy, Truck, TriangleAlert } from "lucide-react";
import { api, useApp } from "../providers";
import { CITIES, INSURERS, local, money, nf } from "../i18n";

type GlassT = "windshield" | "side" | "rear" | "sunroof";
type Claim = { code: string; decision: "repair" | "replace"; total: number };

// Mirrors backend decide() for an instant preview; the server's answer is authoritative.
const repairable = (g: GlassT, size: number, view: boolean, edge: boolean) =>
  (g === "windshield" || g === "rear") && size <= 2.5 && !view && !edge;
const toEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const MOBILE = /^(\+98|0)?9\d{9}$/;

function Car({ value, onPick }: { value: GlassT; onPick: (g: GlassT) => void }) {
  const { t } = useApp();
  const part = (g: GlassT, d: string) => (
    <path className="part" d={d} aria-pressed={value === g} role="button" tabIndex={0} aria-label={t(g)}
      onClick={() => onPick(g)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(g)} />
  );
  return (
    <svg className="car" viewBox="0 0 200 360" aria-label={t("pickGlass")}>
      <rect x="30" y="10" width="140" height="340" rx="58" fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth="2" />
      <rect x="44" y="24" width="112" height="40" rx="18" fill="var(--line)" />
      {part("windshield", "M48 92 Q100 70 152 92 L144 130 Q100 118 56 130 Z")}
      {part("sunroof", "M66 150 H134 V206 H66 Z")}
      {part("side", "M40 140 L50 136 L50 250 L40 246 Z M160 140 L150 136 L150 250 L160 246 Z")}
      {part("rear", "M56 262 Q100 272 144 262 L150 294 Q100 310 50 294 Z")}
    </svg>
  );
}

function Burst() {
  const colors = ["var(--accent)", "var(--accent-2)", "var(--accent-3)", "#34c759"];
  return <>{Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2, d = 160 + (i % 5) * 40;
    return <i key={i} className="shard" style={{ background: colors[i % 4], "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d}px`, "--rot": `${i * 47}deg` } as React.CSSProperties} />;
  })}</>;
}

export default function ClaimPage() {
  const { t, lang } = useApp();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [f, setF] = useState({
    glass: "windshield" as GlassT, size_cm: 1.5, in_driver_view: false, at_edge: false, adas: false,
    name: "", mobile: "", policy_no: "", insurer: INSURERS[0], plate: "", service: "center" as "center" | "mobile", city: "Tehran",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  // Object URLs pin the image bytes in memory until revoked; free them on reset and on leaving the page.
  const urls = useRef<string[]>([]);
  const dropPhotos = () => { urls.current.forEach(URL.revokeObjectURL); urls.current = []; setPhotos([]); };
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  const addPhotos = (files: FileList | null) => {
    const added = Array.from(files || []).slice(0, 10 - photos.length).map((f) => URL.createObjectURL(f));
    urls.current.push(...added);
    setPhotos((p) => [...p, ...added]);
  };
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [done, setDone] = useState<Claim | null>(null);
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const ok = repairable(f.glass, f.size_cm, f.in_driver_view, f.at_edge);
  const errors = {
    name: f.name.trim().length < 2 && t("required"),
    mobile: !f.mobile ? t("required") : !MOBILE.test(toEn(f.mobile)) && t("badMobile"),
    policy_no: f.policy_no.trim().length < 4 && t("required"),
    plate: f.plate.trim().length < 4 && t("required"),
  };
  const go = (d: number) => {
    if (d > 0 && step === 2 && Object.values(errors).some(Boolean)) return setTouched(true);
    setDir(d); setStep((s) => s + d); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submit = async () => {
    setBusy(true); setErr(false);
    try {
      setDone(await api<Claim>("/claims", { method: "POST", body: JSON.stringify({ ...f, mobile: toEn(f.mobile), policy_no: toEn(f.policy_no), plate: toEn(f.plate), photos: photos.length }) }));
    } catch { setErr(true); } finally { setBusy(false); }
  };

  const x = 48 * dir * (lang === "fa" ? -1 : 1);
  const labels = [t("s1"), t("s2"), t("s3"), t("s4")];
  const field = (k: "name" | "mobile" | "policy_no" | "plate", label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field"><span>{label}</span>
      <input className="input" value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={touched && !!errors[k]} {...extra} />
      <span className="err">{touched && errors[k]}</span>
    </label>
  );

  if (done) return (
    <div className="wrap page-head">
      <Burst />
      <div className="wizard glass success">
        <div className="check"><Check size={44} strokeWidth={3} /></div>
        <h1 className="h2">{t("successTitle")}</h1>
        <p className="lead">{t("successSub")}</p>
        <button className="code" onClick={() => { navigator.clipboard?.writeText(done.code); setCopied(true); }} aria-label={t("copy")}>
          {done.code}{copied ? <BadgeCheck size={22} color="var(--good)" /> : <Copy size={20} />}
        </button>
        <div className="summary" style={{ textAlign: "start" }}>
          <div><span className="muted">{t("colDecision")}</span><b>{t(done.decision)}</b></div>
          <div><span className="muted">{t("youPay")}</span><b style={{ color: "var(--good)" }}>{t("zero")}</b></div>
          <div><span className="muted">{t("insurerPays")}</span><b className="num">{money(lang, done.total)}</b></div>
        </div>
        <div className="hero-cta" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" href={`/track?code=${encodeURIComponent(done.code)}`}>{t("trackIt")}</Link>
          <button className="btn btn-ghost" onClick={() => { setDone(null); setStep(0); dropPhotos(); setTouched(false); setCopied(false); }}>{t("newClaim")}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="wrap page-head">
      <div className="center" style={{ marginBottom: 28 }}>
        <h1 className="h2">{t("claimTitle")}</h1>
        <p className="lead">{t("claimSub")}</p>
      </div>
      <div className="wizard glass" style={{ overflow: "hidden" }}>
        <div className="steps">{labels.map((l, i) => <div key={l} className={i <= step ? "on" : ""}>{nf(lang, i + 1)}. {l}</div>)}</div>
        <AnimatePresence mode="popLayout" initial={false} custom={x}>
          <motion.div key={step} initial={{ opacity: 0, x }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -x }}
            transition={{ type: "spring", bounce: 0, duration: 0.45 }}>
            {step === 0 && (
              <div>
                <p className="center muted" style={{ margin: 0 }}>{t("pickGlass")}</p>
                <Car value={f.glass} onPick={(g) => set("glass", g)} />
                <div className="glass-opts">
                  {(["windshield", "side", "rear", "sunroof"] as GlassT[]).map((g) => (
                    <button key={g} className="opt" aria-pressed={f.glass === g} onClick={() => set("glass", g)}>{t(g)}</button>
                  ))}
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="stack">
                <div className="size-viz"><span className={f.size_cm > 2.5 ? "big" : ""} style={{ width: 14 + Math.min(f.size_cm, 40) * 2.4, height: 14 + Math.min(f.size_cm, 40) * 2.4 }} /></div>
                <label className="field"><span>{t("size")}: <b className="num">{nf(lang, f.size_cm)} {t("cm")}</b></span>
                  <input type="range" min={0.5} max={40} step={0.5} value={f.size_cm} onChange={(e) => set("size_cm", +e.target.value)} />
                  <span className="tiny muted">{f.size_cm <= 2.5 && t("coin")}</span>
                </label>
                {([["in_driver_view", "inView"], ["at_edge", "atEdge"], ["adas", "adas"]] as const).map(([k, l]) => (
                  <label key={k} className="toggle"><span>{t(l)}</span><input type="checkbox" role="switch" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /></label>
                ))}
                <div className="field"><span>{t("photos")}</span>
                  <div className="thumbs">
                    {photos.map((p) => <img key={p} src={p} alt="" />)}
                    <label><Camera size={22} /><input className="sr" type="file" accept="image/*" capture="environment" multiple
                      onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                      <span className="sr">{t("addPhoto")}</span></label>
                  </div>
                  <span className="tiny muted">{t("photosLocal")}</span>
                </div>
                <div className={`verdict ${ok ? "ok" : "no"}`} aria-live="polite">
                  {ok ? <BadgeCheck size={28} /> : <TriangleAlert size={28} />}
                  <div><b>{ok ? t("verdictRepair") : t("verdictReplace")}</b><p>{t("verdictHint")}</p></div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="stack">
                {field("name", t("name"), { autoComplete: "name" })}
                <div className="row2">
                  {field("mobile", t("mobile"), { inputMode: "tel", dir: "ltr", autoComplete: "tel", placeholder: "09xx xxx xxxx" })}
                  {field("plate", t("plate"), { dir: "ltr", placeholder: "12 B 345 - 67" })}
                </div>
                <div className="row2">
                  {field("policy_no", t("policy"), { dir: "ltr", placeholder: "BD-123456" })}
                  <label className="field"><span>{t("insurer")}</span>
                    <select className="input" value={f.insurer} onChange={(e) => set("insurer", e.target.value)}>
                      {INSURERS.map((i) => <option key={i} value={i}>{local(lang, i)}</option>)}
                    </select></label>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="stack">
                <div className="row2">
                  {([["center", Building2, "center", "centerD"], ["mobile", Truck, "mobileTeam", "mobileTeamD"]] as const).map(([v, Icon, a, b]) => (
                    <button key={v} className="opt" aria-pressed={f.service === v} onClick={() => set("service", v)} style={{ display: "flex", gap: 12, alignItems: "center", textAlign: "start" }}>
                      <Icon size={26} color="var(--accent)" /><span>{t(a)}<small>{t(b)}</small></span>
                    </button>
                  ))}
                </div>
                <label className="field"><span>{t("city")}</span>
                  <select className="input" value={f.city} onChange={(e) => set("city", e.target.value)}>
                    {CITIES.map((c) => <option key={c} value={c}>{local(lang, c)}</option>)}
                  </select></label>
                <div className="summary">
                  <div><span className="muted">{t("s1")}</span><b>{t(f.glass)}</b></div>
                  <div><span className="muted">{t("colDecision")}</span><b style={{ color: ok ? "var(--good)" : "var(--warn)" }}>{t(ok ? "repair" : "replace")}</b></div>
                  <div><span className="muted">{t("insurer")}</span><b>{local(lang, f.insurer)}</b></div>
                  <div><span className="muted">{t("youPay")}</span><b style={{ color: "var(--good)" }}>{t("zero")}</b></div>
                </div>
                {err && <div className="notice">{t("error")}</div>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="wiz-foot">
          <button className="btn btn-ghost" onClick={() => go(-1)} style={{ visibility: step ? "visible" : "hidden" }}><ArrowLeft size={18} className="flip" />{t("back")}</button>
          {step < 3
            ? <button className="btn btn-primary" onClick={() => go(1)}>{t("next")}<ArrowRight size={18} className="flip" /></button>
            : <button className="btn btn-primary" onClick={submit} disabled={busy}>{t("submit")}<Check size={18} /></button>}
        </div>
      </div>
    </div>
  );
}
