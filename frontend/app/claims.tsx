"use client";
import { useApp } from "./providers";
import { df } from "./i18n";

export type Claim = {
  code: string; name: string; plate: string; insurer: string; glass: "windshield" | "side" | "rear" | "sunroof";
  decision: "repair" | "replace"; total: number; avoided: number; status: Status; created_at: string; city: string;
  service: "center" | "mobile"; photos: number; policy_no: string; size_cm: number; rating: number | null;
  history: { status: Status; at: string }[];
};
export type Status = "received" | "approved" | "scheduled" | "in_service" | "done" | "rejected";
export const FLOW: Status[] = ["received", "approved", "scheduled", "in_service", "done"];

export function Timeline({ c }: { c: Claim }) {
  const { t, lang } = useApp();
  const at = (s: Status) => c.history.findLast((h) => h.status === s)?.at;
  const steps = c.status === "rejected" ? (["received", "rejected"] as Status[]) : FLOW;
  const reached = steps.indexOf(c.status);
  return (
    <div className="timeline">
      <div className="fill" style={{ height: `calc(${(reached / (steps.length - 1)) * 100}% - 12px)` }} />
      {steps.map((s, i) => (
        <div key={s} className={`tl ${i <= reached ? (s === "rejected" ? "bad" : "on") : ""}`}>
          <b>{t(s)}</b>
          <span className="tiny muted">{at(s) ? df(lang, at(s)!, true) : "—"}</span>
        </div>
      ))}
    </div>
  );
}
