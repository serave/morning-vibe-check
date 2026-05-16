import { Capacitor } from "@capacitor/core";
import { CapacitorHealthkit, type QueryOutput } from "@perfood/capacitor-healthkit";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

export type HealthPlatform = "HEALTHKIT" | "HEALTH_CONNECT" | null;

const READ_PERMISSIONS = ["heartRateVariability", "sleepAnalysis", "restingHeartRate"];

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
  // Health Connect: integration pending
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
  sample_type: "hrv_rmssd" | "sleep_hours" | "resting_hr";
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

export const syncHealthData = async (userId: string, daysBack = 7): Promise<SyncedSample[]> => {
  const platform = getHealthPlatform();
  if (platform !== "HEALTHKIT") return [];

  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);
  const samples: SyncedSample[] = [];

  // HRV — values are in seconds (HKUnit: ms = .secondUnit(with: .milli))
  // The plugin returns the raw value; HealthKit HRV samples come as seconds, multiply by 1000
  const hrvData = await queryHK<any>("heartRateVariability", startDate, endDate);
  const hrvByDay = groupByDay(
    hrvData,
    (d: any) => d.startDate,
    (d: any) => {
      const v = Number(d.value ?? d.heartRateVariability ?? 0);
      // HealthKit HRV is in seconds → convert to ms if value < 1
      return v < 1 ? v * 1000 : v;
    }
  );
  for (const [day, values] of hrvByDay) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    samples.push({ sample_type: "hrv_rmssd", value: Math.round(avg * 10) / 10, entry_date: day });
  }

  // Sleep — sum duration (seconds) of "asleep" states per night
  const sleepData = await queryHK<any>("sleepAnalysis", startDate, endDate);
  const sleepByDay = new Map<string, number>();
  for (const s of sleepData) {
    const state = (s.sleepState ?? s.value ?? "").toString().toLowerCase();
    if (!state.includes("asleep") && state !== "asleep" && !state.includes("sleep")) continue;
    if (state.includes("awake") || state.includes("inbed")) continue;
    const dur = Number(s.duration ?? 0);
    const day = format(new Date(s.endDate ?? s.startDate), "yyyy-MM-dd");
    sleepByDay.set(day, (sleepByDay.get(day) ?? 0) + dur);
  }
  for (const [day, secs] of sleepByDay) {
    samples.push({
      sample_type: "sleep_hours",
      value: Math.round((secs / 3600) * 10) / 10,
      entry_date: day,
    });
  }

  // Resting HR — average per day (bpm)
  const rhrData = await queryHK<any>("restingHeartRate", startDate, endDate);
  const rhrByDay = groupByDay(
    rhrData,
    (d: any) => d.startDate,
    (d: any) => Number(d.value ?? d.restingHeartRate ?? 0)
  );
  for (const [day, values] of rhrByDay) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    samples.push({ sample_type: "resting_hr", value: Math.round(avg), entry_date: day });
  }

  if (samples.length > 0) {
    const rows = samples.map((s) => ({ ...s, user_id: userId, source: platform }));
    await supabase
      .from("health_samples")
      .upsert(rows, { onConflict: "user_id,sample_type,entry_date,source" });
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
  source: string | null;
}

export const getTodayHealth = async (userId: string): Promise<TodayHealth> => {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = await supabase
    .from("health_samples")
    .select("sample_type, value, source")
    .eq("user_id", userId)
    .eq("entry_date", today);

  const out: TodayHealth = { hrv_rmssd: null, sleep_hours: null, resting_hr: null, source: null };
  for (const row of data ?? []) {
    out.source = row.source;
    if (row.sample_type === "hrv_rmssd") out.hrv_rmssd = Number(row.value);
    if (row.sample_type === "sleep_hours") out.sleep_hours = Number(row.value);
    if (row.sample_type === "resting_hr") out.resting_hr = Number(row.value);
  }
  return out;
};

export const disconnectHealth = async (userId: string): Promise<void> => {
  await Promise.all([
    supabase.from("health_samples").delete().eq("user_id", userId),
    supabase.from("health_connections").delete().eq("user_id", userId),
  ]);
};

export const getConnection = async (userId: string) => {
  const { data } = await supabase
    .from("health_connections")
    .select("platform, last_synced_at, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
};
