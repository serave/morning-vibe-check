// Whoop-style strain score (0–21) computed from time-in-HR-zone across all
// workouts on a given day. Uses a TRIMP-like weighted load mapped through a
// logarithmic curve so easy sessions score low and very hard/long days
// asymptote toward 21.

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface HRZoneMinutes {
  z1: number; z2: number; z3: number; z4: number; z5: number;
}

// Zone multipliers (Edwards-style TRIMP)
const ZONE_WEIGHTS = [1, 2, 3, 4, 5] as const;

// Tunes the curve. ~80 weighted-min ≈ strain 13 (moderate-hard hour).
// 200+ weighted-min asymptotes to ~20.
const STRAIN_K = 70;

export const estimateMaxHr = (birthYear?: number | null, userMaxHr?: number | null): number => {
  if (userMaxHr && userMaxHr > 100) return userMaxHr;
  if (birthYear && birthYear > 1900) {
    const age = new Date().getFullYear() - birthYear;
    // Tanaka formula
    return Math.round(208 - 0.7 * age);
  }
  return 190;
};

export const hrToZone = (bpm: number, maxHr: number): 1 | 2 | 3 | 4 | 5 | 0 => {
  if (!bpm || bpm <= 0) return 0;
  const pct = bpm / maxHr;
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
};

// HR samples may be irregularly spaced — sum duration each sample "represents"
// by attributing each sample to the gap until the next one (capped at 30s).
export const zonesFromHrSamples = (
  samples: { date: Date; bpm: number }[],
  maxHr: number,
  workoutStart: Date,
  workoutEnd: Date
): HRZoneMinutes => {
  const out: HRZoneMinutes = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  if (!samples.length) return out;
  const sorted = [...samples].sort((a, b) => a.date.getTime() - b.date.getTime());
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nextT = i + 1 < sorted.length ? sorted[i + 1].date.getTime() : workoutEnd.getTime();
    let dtSec = Math.min(30, Math.max(0, (nextT - cur.date.getTime()) / 1000));
    if (cur.date < workoutStart || cur.date > workoutEnd) continue;
    const z = hrToZone(cur.bpm, maxHr);
    if (!z) continue;
    const min = dtSec / 60;
    if (z === 1) out.z1 += min;
    else if (z === 2) out.z2 += min;
    else if (z === 3) out.z3 += min;
    else if (z === 4) out.z4 += min;
    else if (z === 5) out.z5 += min;
  }
  return out;
};

// Convert weighted load to a 0–21 strain score (Whoop-like log curve).
export const loadToStrain = (weightedMin: number): number => {
  if (weightedMin <= 0) return 0;
  const s = 21 * (1 - Math.exp(-weightedMin / STRAIN_K));
  return Math.round(s * 10) / 10;
};

// Per-workout strain — useful if a workout has no HR (estimate from duration+intensity).
export const strainFromZones = (z: HRZoneMinutes): number => {
  const load =
    z.z1 * ZONE_WEIGHTS[0] +
    z.z2 * ZONE_WEIGHTS[1] +
    z.z3 * ZONE_WEIGHTS[2] +
    z.z4 * ZONE_WEIGHTS[3] +
    z.z5 * ZONE_WEIGHTS[4];
  return loadToStrain(load);
};

// Fallback when no HR data: assume duration mostly in Z2/Z3 with a small Z4 bump.
export const estimateStrainNoHr = (durationMin: number): number => {
  if (!durationMin || durationMin <= 0) return 0;
  // Roughly 2.5 weighted-min per real minute (between Z2 and Z3)
  return loadToStrain(durationMin * 2.5);
};

// Combine multiple workouts' weighted loads into a single daily strain.
export const computeDailyStrain = async (userId: string, date: string): Promise<number> => {
  const { data: workouts } = await supabase
    .from("health_workouts")
    .select("zone1_min, zone2_min, zone3_min, zone4_min, zone5_min, duration_min, strain")
    .eq("user_id", userId)
    .eq("entry_date", date);

  if (!workouts?.length) return 0;
  let totalLoad = 0;
  for (const w of workouts) {
    const z1 = Number(w.zone1_min) || 0;
    const z2 = Number(w.zone2_min) || 0;
    const z3 = Number(w.zone3_min) || 0;
    const z4 = Number(w.zone4_min) || 0;
    const z5 = Number(w.zone5_min) || 0;
    const zoneSum = z1 + z2 + z3 + z4 + z5;
    if (zoneSum > 0) {
      totalLoad += z1 + z2 * 2 + z3 * 3 + z4 * 4 + z5 * 5;
    } else {
      // No HR — estimate from duration
      totalLoad += (Number(w.duration_min) || 0) * 2.5;
    }
  }
  return loadToStrain(totalLoad);
};

// Convenience: recompute today's strain and persist to today's checkin if present.
export const updateTodayStrain = async (userId: string): Promise<number> => {
  const today = format(new Date(), "yyyy-MM-dd");
  const strain = await computeDailyStrain(userId, today);
  await supabase
    .from("checkins")
    .update({ strain_score: strain })
    .eq("user_id", userId)
    .eq("entry_date", today);
  return strain;
};
