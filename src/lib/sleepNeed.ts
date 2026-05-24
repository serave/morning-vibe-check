import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { computeDailyStrain } from "@/lib/strain";

export interface SleepNeedResult {
  baseNeedH: number;        // baseline sleep need (hours)
  strainAddH: number;       // extra need from yesterday's strain
  debtAddH: number;         // extra need from last 7-day sleep debt
  totalNeedH: number;       // baseNeed + strainAdd + debtAdd
  lastNightH: number | null;
  debt7dH: number;          // total sleep debt vs base over last 7 nights (h)
  avgSleep7dH: number | null;
  yesterdayStrain: number;
  recommendation: string;   // short coaching line
}

const BASE_NEED_H = 8.0;

// Whoop-like: strain adds ~3–4 min of sleep need per strain point above 10.
const strainToExtraSleep = (strain: number): number => {
  if (strain <= 10) return 0;
  const extraMin = (strain - 10) * 4; // 4 min per point over 10
  return Math.min(1.5, extraMin / 60); // cap at +1.5h
};

export const computeSleepNeed = async (
  userId: string,
  asOf: Date = new Date(),
): Promise<SleepNeedResult> => {
  const today = format(asOf, "yyyy-MM-dd");
  const yesterday = format(subDays(asOf, 1), "yyyy-MM-dd");
  const weekStart = format(subDays(asOf, 7), "yyyy-MM-dd");

  // Pull last 8 days of sleep_hours from health_samples (fall back to checkins).
  const [{ data: samples }, { data: checkins }, yStrain] = await Promise.all([
    supabase
      .from("health_samples")
      .select("entry_date, value")
      .eq("user_id", userId)
      .eq("sample_type", "sleep_hours")
      .gte("entry_date", weekStart)
      .lte("entry_date", today),
    supabase
      .from("checkins")
      .select("entry_date, sleep_hours")
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", today),
    computeDailyStrain(userId, yesterday),
  ]);

  // Merge sleep sources: prefer health_samples, fallback to checkin entry.
  const sleepByDay = new Map<string, number>();
  for (const c of checkins ?? []) {
    if (c.sleep_hours != null) sleepByDay.set(c.entry_date, Number(c.sleep_hours));
  }
  for (const s of samples ?? []) {
    sleepByDay.set(s.entry_date, Number(s.value));
  }

  const lastNightH = sleepByDay.get(yesterday) ?? sleepByDay.get(today) ?? null;

  // 7-day debt: sum of (BASE_NEED - actual) for nights where we have data, floored at 0 per night.
  let debt = 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i <= 7; i++) {
    const d = format(subDays(asOf, i), "yyyy-MM-dd");
    const h = sleepByDay.get(d);
    if (h == null) continue;
    sum += h;
    count += 1;
    debt += Math.max(0, BASE_NEED_H - h);
  }
  const avgSleep7dH = count > 0 ? sum / count : null;

  const strainAddH = strainToExtraSleep(yStrain);
  // Add back ~30% of accumulated debt onto tonight's need (rest paid down over multiple nights).
  const debtAddH = Math.min(2.0, debt * 0.3);
  const totalNeedH = BASE_NEED_H + strainAddH + debtAddH;

  let recommendation = "";
  if (totalNeedH - (lastNightH ?? 0) >= 1) {
    recommendation = `Aim for ~${totalNeedH.toFixed(1)}h tonight — earlier bedtime recommended.`;
  } else if (debt >= 3) {
    recommendation = `You're carrying ~${debt.toFixed(1)}h of sleep debt. Prioritize an extra long night.`;
  } else if (strainAddH > 0.3) {
    recommendation = `Yesterday's strain (${yStrain.toFixed(1)}) adds ~${(strainAddH * 60).toFixed(0)} min to tonight's need.`;
  } else {
    recommendation = `Baseline night — ~${totalNeedH.toFixed(1)}h should keep you fresh.`;
  }

  return {
    baseNeedH: BASE_NEED_H,
    strainAddH,
    debtAddH,
    totalNeedH,
    lastNightH,
    debt7dH: debt,
    avgSleep7dH,
    yesterdayStrain: yStrain,
    recommendation,
  };
};
