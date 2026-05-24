import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

export interface IllnessSignal {
  key: "rhr" | "hrv" | "skin_temp" | "resp" | "spo2";
  label: string;
  detail: string; // e.g. "+2.1σ"
}

export type IllnessSeverity = "none" | "minor" | "watch" | "possible_illness";

export type TrainingAction = "REST" | "SKIP" | "EASY" | "LIGHT" | "NORMAL";

export interface TrainingRecommendation {
  action: TrainingAction;
  emoji: string;
  label: string;
  rationale: string;
}

export interface IllnessAssessment {
  severity: IllnessSeverity;
  title: string;
  message: string;
  signals: IllnessSignal[];
  recommendation: TrainingRecommendation | null;
}

type Row = { sample_type: string; value: number; entry_date: string };

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const std = (a: number[], m: number) =>
  Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);

const baseline = (rows: Row[], transform: (v: number) => number = (v) => v) => {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  const latest = sorted[0];
  const hist = sorted.slice(1).map((r) => transform(r.value)).filter(Number.isFinite);
  if (hist.length < 7) return { latest: latest.value, latestT: transform(latest.value), m: null, s: null, z: null };
  const m = mean(hist);
  const s = std(hist, m);
  const lt = transform(latest.value);
  const z = s > 0 ? (lt - m) / s : 0;
  return { latest: latest.value, latestT: lt, m, s, z };
};

export const detectIllness = async (
  userId: string,
  asOf: Date = new Date(),
): Promise<IllnessAssessment> => {
  const endStr = format(asOf, "yyyy-MM-dd");
  const startStr = format(subDays(asOf, 60), "yyyy-MM-dd");

  const { data } = await supabase
    .from("health_samples")
    .select("sample_type, value, entry_date")
    .eq("user_id", userId)
    .gte("entry_date", startStr)
    .lte("entry_date", endStr)
    .in("sample_type", ["resting_hr", "hrv_rmssd", "skin_temp_delta", "respiratory_rate", "spo2"]);

  const by = (t: string) => (data ?? []).filter((r) => r.sample_type === t) as Row[];

  const rhr = baseline(by("resting_hr"));
  const hrv = baseline(by("hrv_rmssd"), (v) => Math.log(Math.max(v, 1))); // ln-transform
  const skin = baseline(by("skin_temp_delta"));
  const resp = baseline(by("respiratory_rate"));
  const spo2 = baseline(by("spo2"));

  const signals: IllnessSignal[] = [];

  if (rhr?.z != null && rhr.z >= 1.5) {
    signals.push({ key: "rhr", label: "Elevated resting HR", detail: `+${rhr.z.toFixed(1)}σ (${Math.round(rhr.latest)} bpm)` });
  }
  if (hrv?.z != null && hrv.z <= -1.0) {
    signals.push({ key: "hrv", label: "Suppressed HRV", detail: `${hrv.z.toFixed(1)}σ (${Math.round(hrv.latest)} ms)` });
  }
  // Skin temp: flag if z high OR absolute Δ above +0.4°C
  if (skin && ((skin.z != null && skin.z >= 1.5) || skin.latest >= 0.4)) {
    const z = skin.z != null ? `${skin.z >= 0 ? "+" : ""}${skin.z.toFixed(1)}σ` : "n/a";
    signals.push({ key: "skin_temp", label: "Elevated skin temp", detail: `${skin.latest.toFixed(2)}°C (${z})` });
  }
  if (resp?.z != null && resp.z >= 1.5) {
    signals.push({ key: "resp", label: "Elevated breathing rate", detail: `+${resp.z.toFixed(1)}σ (${resp.latest.toFixed(1)})` });
  }
  if (spo2 && ((spo2.z != null && spo2.z <= -1.5) || spo2.latest < 94)) {
    const z = spo2.z != null ? `${spo2.z.toFixed(1)}σ` : "n/a";
    signals.push({ key: "spo2", label: "Low SpO₂", detail: `${spo2.latest.toFixed(1)}% (${z})` });
  }

  let severity: IllnessSeverity = "none";
  let title = "";
  let message = "";

  if (signals.length >= 3) {
    severity = "possible_illness";
    title = "Possible illness detected";
    message = "Multiple physiological markers are off your baseline. Consider extra rest, hydration, and skipping hard training today.";
  } else if (signals.length === 2) {
    severity = "watch";
    title = "Watch your recovery";
    message = "Two metrics are drifting from baseline — could be early stress or illness. Take it easy and re-check tomorrow.";
  } else if (signals.length === 1) {
    severity = "minor";
    title = "Minor variance";
    message = "One metric is outside your normal range. Likely benign, but worth noting.";
  }

  const recommendation = buildRecommendation(severity, signals);
  return { severity, title, message, signals, recommendation };
};

const buildRecommendation = (
  severity: IllnessSeverity,
  signals: IllnessSignal[],
): TrainingRecommendation | null => {
  if (severity === "none") return null;
  const reasons = signals.map((s) => s.label.toLowerCase()).join(", ");
  if (severity === "possible_illness") {
    return {
      action: "REST",
      emoji: "🛌",
      label: "Rest today — skip training",
      rationale: `Your body is showing multiple illness signals (${reasons}). Hard training now risks deeper fatigue or longer illness. Prioritize sleep, fluids, and light movement only.`,
    };
  }
  if (severity === "watch") {
    return {
      action: "SKIP",
      emoji: "🚶",
      label: "Skip intensity — easy movement only",
      rationale: `Two markers are drifting (${reasons}). Replace today's workout with a walk, mobility, or Z1 cardio. Re-assess tomorrow.`,
    };
  }
  return {
    action: "LIGHT",
    emoji: "🧘",
    label: "Go light — keep effort easy",
    rationale: `Minor variance in ${reasons}. Likely benign, but pull intensity back ~20% and avoid maximal efforts today.`,
  };
};
