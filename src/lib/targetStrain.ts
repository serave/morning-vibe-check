import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { computeDailyStrain } from "@/lib/strain";

export type StrainBand = "RECOVER" | "MAINTAIN" | "BUILD" | "PEAK";

export interface TargetStrainResult {
  recovery: number | null;        // 0-100
  band: StrainBand;
  targetMin: number;              // 0-21
  targetMax: number;
  targetMid: number;
  yesterdayStrain: number;
  avgStrain7d: number | null;
  headline: string;               // e.g. "Today's target strain: 8–12"
  rationale: string;
}

const bandFor = (recovery: number | null): StrainBand => {
  if (recovery == null) return "MAINTAIN";
  if (recovery < 34) return "RECOVER";
  if (recovery < 67) return "MAINTAIN";
  if (recovery < 85) return "BUILD";
  return "PEAK";
};

const rangeFor = (band: StrainBand): [number, number] => {
  switch (band) {
    case "RECOVER": return [0, 8];
    case "MAINTAIN": return [8, 13];
    case "BUILD": return [12, 16];
    case "PEAK": return [15, 19];
  }
};

export const computeTargetStrain = async (
  userId: string,
  asOf: Date = new Date(),
): Promise<TargetStrainResult> => {
  const today = format(asOf, "yyyy-MM-dd");
  const yesterday = format(subDays(asOf, 1), "yyyy-MM-dd");
  const weekStart = format(subDays(asOf, 7), "yyyy-MM-dd");

  const [{ data: checkin }, { data: week }, yStrain] = await Promise.all([
    supabase
      .from("checkins")
      .select("recovery_score")
      .eq("user_id", userId)
      .eq("entry_date", today)
      .maybeSingle(),
    supabase
      .from("checkins")
      .select("entry_date, strain_score")
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", today),
    computeDailyStrain(userId, yesterday),
  ]);

  const recovery = checkin?.recovery_score != null ? Number(checkin.recovery_score) : null;
  const band = bandFor(recovery);
  let [lo, hi] = rangeFor(band);

  // Nudge target down if 7d average is already high (overreaching guard)
  const strains = (week ?? [])
    .map((r) => (r.strain_score == null ? null : Number(r.strain_score)))
    .filter((v): v is number => v != null);
  const avg7 = strains.length ? strains.reduce((s, v) => s + v, 0) / strains.length : null;
  if (avg7 != null && avg7 >= 14 && band !== "RECOVER") {
    lo = Math.max(0, lo - 2);
    hi = Math.max(lo + 2, hi - 2);
  }

  const mid = (lo + hi) / 2;

  const recStr = recovery != null ? `${Math.round(recovery)}%` : "—";
  let headline = "";
  let rationale = "";
  switch (band) {
    case "RECOVER":
      headline = `Recover today — target strain ${lo}–${hi}`;
      rationale = `Recovery is ${recStr}. Keep effort light: mobility, easy zone-2, or a full rest day. Hard intensity now will dig a deeper hole.`;
      break;
    case "MAINTAIN":
      headline = `Maintain today — target strain ${lo}–${hi}`;
      rationale = `Recovery is ${recStr}. A moderate session (steady aerobic or technique work) keeps fitness without overreaching.`;
      break;
    case "BUILD":
      headline = `Build today — target strain ${lo}–${hi}`;
      rationale = `Recovery is ${recStr}. Good window for quality work — threshold, tempo, or a solid strength session.`;
      break;
    case "PEAK":
      headline = `Peak day — target strain ${lo}–${hi}`;
      rationale = `Recovery is ${recStr}. Green light for max intensity — intervals, race effort, or PR attempts.`;
      break;
  }
  if (avg7 != null && avg7 >= 14 && band !== "RECOVER") {
    rationale += ` 7-day average strain is ${avg7.toFixed(1)} — target pulled back to avoid overreach.`;
  }
  if (yStrain >= 15) {
    rationale += ` Yesterday's strain was ${yStrain.toFixed(1)} — make today notably easier.`;
  }

  return {
    recovery,
    band,
    targetMin: lo,
    targetMax: hi,
    targetMid: mid,
    yesterdayStrain: yStrain,
    avgStrain7d: avg7,
    headline,
    rationale,
  };
};
