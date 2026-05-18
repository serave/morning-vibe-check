import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { CapacitorHealthkit, type QueryOutput } from "@perfood/capacitor-healthkit";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import {
  estimateMaxHr,
  zonesFromHrSamples,
  strainFromZones,
  estimateStrainNoHr,
  updateTodayStrain,
} from "@/lib/strain";

export type HealthPlatform = "HEALTHKIT" | "HEALTH_CONNECT" | null;

// All metrics we attempt to read. Some (respiratoryRate, appleSleepingWristTemperature)
// may not be exposed on every device / iOS version — queries fail gracefully.
const READ_PERMISSIONS = [
  "heartRateVariability",
  "sleepAnalysis",
  "restingHeartRate",
  "respiratoryRate",
  "oxygenSaturation",
  "appleSleepingWristTemperature",
  "vo2Max",
  "workoutType",
  "heartRate",
];

export type HealthSampleType =
  | "hrv_rmssd"
  | "sleep_hours"
  | "sleep_deep_hours"
  | "sleep_rem_hours"
  | "sleep_light_hours"
  | "sleep_awake_hours"
  | "resting_hr"
  | "respiratory_rate"
  | "spo2"
  | "skin_temp_delta"
  | "vo2_max";

export const getHealthPlatform = (): HealthPlatform => {
  if (!Capacitor.isNativePlatform()) return null;
  const p = Capacitor.getPlatform();
  if (p === "ios") return "HEALTHKIT";
  if (p === "android") return "HEALTH_CONNECT";
  return null;
};

export const isHealthAvailable = async (): Promise<boolean> => {
  const platform = getHealthPlatform();
  if (platform === "HEALTHKIT") {
    try {
      await CapacitorHealthkit.isAvailable();
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

export const requestHealthPermissions = async (): Promise<boolean> => {
  const platform = getHealthPlatform();
  if (platform === "HEALTHKIT") {
    try {
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: READ_PERMISSIONS,
        write: [],
      });
      return true;
    } catch (e) {
      console.error("HealthKit permission error", e);
      return false;
    }
  }
  return false;
};

interface SyncedSample {
  sample_type: HealthSampleType;
  value: number;
  entry_date: string;
}

const queryHK = async <T,>(sampleName: string, startDate: Date, endDate: Date) => {
  try {
    const res = (await CapacitorHealthkit.queryHKitSampleType<T>({
      sampleName,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 0,
    })) as QueryOutput<T>;
    return res?.resultData ?? [];
  } catch (e) {
    console.warn(`HealthKit query failed for ${sampleName}`, e);
    return [];
  }
};

const groupByDay = <T,>(items: T[], dateKey: (i: T) => string, valueFn: (i: T) => number) => {
  const map = new Map<string, number[]>();
  for (const item of items) {
    const day = format(new Date(dateKey(item)), "yyyy-MM-dd");
    const arr = map.get(day) ?? [];
    arr.push(valueFn(item));
    map.set(day, arr);
  }
  return map;
};

const avgByDay = (
  data: any[],
  type: HealthSampleType,
  valueFn: (d: any) => number,
  round = 1
): SyncedSample[] => {
  const grouped = groupByDay(data, (d: any) => d.startDate ?? d.endDate, valueFn);
  const out: SyncedSample[] = [];
  for (const [day, values] of grouped) {
    const valid = values.filter((v) => Number.isFinite(v) && v > 0);
    if (!valid.length) continue;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    const factor = Math.pow(10, round);
    out.push({ sample_type: type, value: Math.round(avg * factor) / factor, entry_date: day });
  }
  return out;
};

const syncWorkouts = async (userId: string, source: string, startDate: Date, endDate: Date) => {
  const data = await queryHK<any>("workoutType", startDate, endDate);
  if (!data.length) return 0;

  // Lookup user's max HR for zone calc
  const { data: profile } = await supabase
    .from("profiles")
    .select("max_hr, birth_year")
    .eq("id", userId)
    .maybeSingle();
  const maxHr = estimateMaxHr(profile?.birth_year, profile?.max_hr);

  // Pull all HR samples in range once (cheaper than per-workout queries)
  const hrAll = await queryHK<any>("heartRate", startDate, endDate);
  const hrSamples = hrAll
    .map((h: any) => ({
      date: new Date(h.startDate ?? h.endDate),
      bpm: Number(h.value ?? h.heartRate ?? 0),
    }))
    .filter((h: any) => h.bpm > 0 && !isNaN(h.date.getTime()));

  const rows = data
    .map((w: any) => {
      const start = w.startDate ?? w.start;
      const end = w.endDate ?? w.end ?? start;
      if (!start) return null;
      const startDt = new Date(start);
      const endDt = new Date(end);
      const dur = Number(w.duration ?? 0);
      const durationMin = dur ? Math.round((dur / 60) * 10) / 10 : Math.max(0, (endDt.getTime() - startDt.getTime()) / 60000);

      const inWindow = hrSamples.filter((s) => s.date >= startDt && s.date <= endDt);
      const zones = zonesFromHrSamples(inWindow, maxHr, startDt, endDt);
      const hasHr = inWindow.length > 0;
      const bpms = inWindow.map((s) => s.bpm);
      const avgHr = bpms.length ? bpms.reduce((a, b) => a + b, 0) / bpms.length : null;
      const maxHrW = bpms.length ? Math.max(...bpms) : null;
      const strain = hasHr ? strainFromZones(zones) : estimateStrainNoHr(durationMin);

      return {
        user_id: userId,
        source,
        external_id: w.uuid ?? null,
        activity_type: w.workoutActivityName ?? w.workoutActivityType ?? w.activityType ?? "unknown",
        start_at: startDt.toISOString(),
        end_at: endDt.toISOString(),
        duration_min: Math.round(durationMin * 10) / 10 || null,
        energy_kcal: Number(w.totalEnergyBurned ?? w.energy ?? 0) || null,
        distance_m: Number(w.totalDistance ?? w.distance ?? 0) || null,
        entry_date: format(startDt, "yyyy-MM-dd"),
        avg_hr: avgHr ? Math.round(avgHr) : null,
        max_hr: maxHrW ? Math.round(maxHrW) : null,
        zone1_min: Math.round(zones.z1 * 10) / 10,
        zone2_min: Math.round(zones.z2 * 10) / 10,
        zone3_min: Math.round(zones.z3 * 10) / 10,
        zone4_min: Math.round(zones.z4 * 10) / 10,
        zone5_min: Math.round(zones.z5 * 10) / 10,
        strain,
      };
    })
    .filter(Boolean);
  if (!rows.length) return 0;
  await supabase
    .from("health_workouts")
    .upsert(rows as any[], { onConflict: "user_id,source,start_at,activity_type" });
  return rows.length;
};

export const syncHealthData = async (userId: string, daysBack = 7): Promise<SyncedSample[]> => {
  const platform = getHealthPlatform();
  if (platform !== "HEALTHKIT") return [];

  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);
  const samples: SyncedSample[] = [];

  // HRV (HealthKit returns seconds for ms unit < 1 → convert)
  const hrvData = await queryHK<any>("heartRateVariability", startDate, endDate);
  samples.push(
    ...avgByDay(hrvData, "hrv_rmssd", (d) => {
      const v = Number(d.value ?? d.heartRateVariability ?? 0);
      return v < 1 ? v * 1000 : v;
    })
  );

  // Sleep — total + per-stage hours
  const sleepData = await queryHK<any>("sleepAnalysis", startDate, endDate);
  const stageTotals: Record<string, Map<string, number>> = {
    total: new Map(),
    deep: new Map(),
    rem: new Map(),
    light: new Map(),
    awake: new Map(),
  };
  for (const s of sleepData) {
    const stateRaw = (s.sleepState ?? s.value ?? "").toString().toLowerCase();
    const dur = Number(s.duration ?? 0);
    if (!dur) continue;
    const day = format(new Date(s.endDate ?? s.startDate), "yyyy-MM-dd");
    const addTo = (k: string) => stageTotals[k].set(day, (stageTotals[k].get(day) ?? 0) + dur);

    if (stateRaw.includes("inbed")) continue;
    if (stateRaw.includes("awake")) {
      addTo("awake");
      continue;
    }
    if (stateRaw.includes("deep") || stateRaw.includes("asleepdeep")) {
      addTo("deep"); addTo("total"); continue;
    }
    if (stateRaw.includes("rem") || stateRaw.includes("asleeprem")) {
      addTo("rem"); addTo("total"); continue;
    }
    if (stateRaw.includes("core") || stateRaw.includes("light") || stateRaw.includes("asleepcore")) {
      addTo("light"); addTo("total"); continue;
    }
    if (stateRaw.includes("asleep") || stateRaw.includes("sleep")) {
      addTo("total");
    }
  }
  const pushStage = (m: Map<string, number>, type: HealthSampleType) => {
    for (const [day, secs] of m) {
      samples.push({ sample_type: type, value: Math.round((secs / 3600) * 10) / 10, entry_date: day });
    }
  };
  pushStage(stageTotals.total, "sleep_hours");
  pushStage(stageTotals.deep, "sleep_deep_hours");
  pushStage(stageTotals.rem, "sleep_rem_hours");
  pushStage(stageTotals.light, "sleep_light_hours");
  pushStage(stageTotals.awake, "sleep_awake_hours");

  // Resting HR
  const rhrData = await queryHK<any>("restingHeartRate", startDate, endDate);
  samples.push(...avgByDay(rhrData, "resting_hr", (d) => Number(d.value ?? d.restingHeartRate ?? 0), 0));

  // Respiratory rate (breaths/min)
  const respData = await queryHK<any>("respiratoryRate", startDate, endDate);
  samples.push(...avgByDay(respData, "respiratory_rate", (d) => Number(d.value ?? d.respiratoryRate ?? 0)));

  // SpO2 (HealthKit returns 0–1 fraction → convert to %)
  const spo2Data = await queryHK<any>("oxygenSaturation", startDate, endDate);
  samples.push(
    ...avgByDay(spo2Data, "spo2", (d) => {
      const v = Number(d.value ?? d.oxygenSaturation ?? 0);
      return v > 0 && v <= 1 ? v * 100 : v;
    })
  );

  // Skin temp wrist delta (°C; signed)
  const skinData = await queryHK<any>("appleSleepingWristTemperature", startDate, endDate);
  samples.push(
    ...avgByDay(skinData, "skin_temp_delta", (d) => Number(d.value ?? d.appleSleepingWristTemperature ?? 0), 2)
  );

  // VO2 Max — Apple writes ~1 reading/week. Pull a wider window so the trend
  // chart has enough points even when daysBack is small.
  const vo2Start = subDays(endDate, Math.max(daysBack, 365));
  const vo2Data = await queryHK<any>("vo2Max", vo2Start, endDate);
  samples.push(
    ...avgByDay(vo2Data, "vo2_max", (d) => Number(d.value ?? d.vo2Max ?? 0), 1)
  );

  if (samples.length > 0) {
    const rows = samples.map((s) => ({ ...s, user_id: userId, source: platform }));
    await supabase
      .from("health_samples")
      .upsert(rows, { onConflict: "user_id,sample_type,entry_date,source" });
  }

  // Workouts + daily strain
  try {
    await syncWorkouts(userId, platform, startDate, endDate);
    await updateTodayStrain(userId);
  } catch (e) {
    console.warn("Workout/strain sync failed", e);
  }

  await supabase.from("health_connections").upsert(
    {
      user_id: userId,
      platform,
      permissions_granted: READ_PERMISSIONS,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return samples;
};

export interface TodayHealth {
  hrv_rmssd: number | null;
  sleep_hours: number | null;
  resting_hr: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  skin_temp_delta: number | null;
  sleep_deep_hours: number | null;
  sleep_rem_hours: number | null;
  vo2_max: number | null;
  source: string | null;
}

export const getTodayHealth = async (userId: string): Promise<TodayHealth> => {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = await supabase
    .from("health_samples")
    .select("sample_type, value, source")
    .eq("user_id", userId)
    .eq("entry_date", today);

  const out: TodayHealth = {
    hrv_rmssd: null, sleep_hours: null, resting_hr: null,
    respiratory_rate: null, spo2: null, skin_temp_delta: null,
    sleep_deep_hours: null, sleep_rem_hours: null, source: null,
  };
  for (const row of data ?? []) {
    out.source = row.source;
    const k = row.sample_type as keyof TodayHealth;
    if (k in out) (out as any)[k] = Number(row.value);
  }
  return out;
};

export const disconnectHealth = async (userId: string): Promise<void> => {
  await Promise.all([
    supabase.from("health_samples").delete().eq("user_id", userId),
    supabase.from("health_workouts").delete().eq("user_id", userId),
    supabase.from("health_connections").delete().eq("user_id", userId),
  ]);
  stopBackgroundSync();
};

export const getConnection = async (userId: string) => {
  const { data } = await supabase
    .from("health_connections")
    .select("platform, last_synced_at, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
};

// ---------- Background / automatic sync ----------
// Runs on app launch + every time the app returns to the foreground, with a
// throttled in-app interval as a fallback while open. iOS does not allow
// arbitrary background execution from JS, so we sync on app resume which is
// the standard pattern for HealthKit-backed apps.

const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const FOREGROUND_POLL_MS = 30 * 60 * 1000; // 30 min while app open
let lastAutoSyncAt = 0;
let appListenerHandle: { remove: () => void } | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeUserId: string | null = null;

const runAutoSync = async (force = false) => {
  if (!activeUserId) return;
  if (!getHealthPlatform()) return;
  const now = Date.now();
  if (!force && now - lastAutoSyncAt < MIN_SYNC_INTERVAL_MS) return;
  lastAutoSyncAt = now;
  try {
    await syncHealthData(activeUserId, 2);
  } catch (e) {
    console.warn("Auto-sync failed", e);
  }
};

export const startBackgroundSync = async (userId: string) => {
  activeUserId = userId;
  if (!getHealthPlatform()) return;

  // Initial sync on launch
  void runAutoSync(true);

  // Re-sync on resume
  if (!appListenerHandle) {
    try {
      appListenerHandle = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void runAutoSync();
      });
    } catch (e) {
      console.warn("App state listener failed", e);
    }
  }

  // Periodic fallback while app is open
  if (!pollTimer) {
    pollTimer = setInterval(() => void runAutoSync(), FOREGROUND_POLL_MS);
  }
};

export const stopBackgroundSync = () => {
  activeUserId = null;
  appListenerHandle?.remove();
  appListenerHandle = null;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};
