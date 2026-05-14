import { Capacitor } from "@capacitor/core";
import { CapacitorHealth } from "capacitor-health";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

export type HealthPlatform = "HEALTHKIT" | "HEALTH_CONNECT" | null;

export const PERMISSIONS = ["READ_HEART_RATE_VARIABILITY", "READ_SLEEP", "READ_RESTING_HEART_RATE"];

export const getHealthPlatform = (): HealthPlatform => {
  if (!Capacitor.isNativePlatform()) return null;
  const p = Capacitor.getPlatform();
  if (p === "ios") return "HEALTHKIT";
  if (p === "android") return "HEALTH_CONNECT";
  return null;
};

export const isHealthAvailable = async (): Promise<boolean> => {
  if (!getHealthPlatform()) return false;
  try {
    const res = await CapacitorHealth.isHealthAvailable();
    return !!res?.available;
  } catch {
    return false;
  }
};

export const requestHealthPermissions = async (): Promise<boolean> => {
  if (!getHealthPlatform()) return false;
  try {
    await CapacitorHealth.requestHealthPermissions({ permissions: PERMISSIONS as any });
    return true;
  } catch (e) {
    console.error("health permission error", e);
    return false;
  }
};

interface SyncedSample {
  sample_type: "hrv_rmssd" | "sleep_hours" | "resting_hr";
  value: number;
  entry_date: string;
}

export const syncHealthData = async (userId: string, daysBack = 7): Promise<SyncedSample[]> => {
  const platform = getHealthPlatform();
  if (!platform) return [];

  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);
  const samples: SyncedSample[] = [];

  // HRV (RMSSD in ms)
  try {
    const hrv: any = await CapacitorHealth.queryAggregated({
      dataType: "heart-rate-variability" as any,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      bucket: "day",
    });
    for (const r of hrv?.aggregatedData ?? []) {
      if (r.value != null) {
        samples.push({
          sample_type: "hrv_rmssd",
          value: Number(r.value),
          entry_date: format(new Date(r.startDate), "yyyy-MM-dd"),
        });
      }
    }
  } catch (e) {
    console.warn("HRV query failed", e);
  }

  // Sleep (hours)
  try {
    const sleep: any = await CapacitorHealth.queryAggregated({
      dataType: "sleep" as any,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      bucket: "day",
    });
    for (const r of sleep?.aggregatedData ?? []) {
      if (r.value != null) {
        samples.push({
          sample_type: "sleep_hours",
          value: Number(r.value) / 3600, // seconds → hours
          entry_date: format(new Date(r.startDate), "yyyy-MM-dd"),
        });
      }
    }
  } catch (e) {
    console.warn("Sleep query failed", e);
  }

  // Resting HR
  try {
    const rhr: any = await CapacitorHealth.queryAggregated({
      dataType: "resting-heart-rate" as any,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      bucket: "day",
    });
    for (const r of rhr?.aggregatedData ?? []) {
      if (r.value != null) {
        samples.push({
          sample_type: "resting_hr",
          value: Number(r.value),
          entry_date: format(new Date(r.startDate), "yyyy-MM-dd"),
        });
      }
    }
  } catch (e) {
    console.warn("RHR query failed", e);
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
      permissions_granted: PERMISSIONS,
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

export const getConnection = async (userId: string) => {
  const { data } = await supabase
    .from("health_connections")
    .select("platform, last_synced_at, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
};
