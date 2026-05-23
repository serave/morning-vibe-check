import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

export type BaselineMetric =
  | "resting_hr"
  | "respiratory_rate"
  | "spo2"
  | "skin_temp_delta";

// "lower" = lower values are better (e.g. RHR);
// "higher" = higher values are better (e.g. SpO2);
// "stable" = closer to baseline is better (e.g. skin_temp_delta) — uses |z|.
type Direction = "lower" | "higher" | "stable";

export interface MetricConfig {
  key: BaselineMetric;
  label: string;
  unit: string;
  decimals: number;
  direction: Direction;
}

export const METRIC_CONFIGS: MetricConfig[] = [
  { key: "resting_hr",       label: "Resting HR",     unit: "bpm",   decimals: 0, direction: "lower"  },
  { key: "respiratory_rate", label: "Respiratory",    unit: "br/min",decimals: 1, direction: "stable" },
  { key: "spo2",             label: "SpO₂",           unit: "%",     decimals: 1, direction: "higher" },
  { key: "skin_temp_delta",  label: "Skin temp Δ",    unit: "°C",    decimals: 2, direction: "stable" },
];

export interface MetricBaseline {
  key: BaselineMetric;
  latest: number | null;
  latestDate: string | null;
  mean: number | null;
  std: number | null;
  z: number | null;          // signed z-score of latest vs baseline
  deviationPct: number | null; // (latest - mean)/mean * 100
  status: "good" | "ok" | "warn" | "low_data"; // direction-aware
  sampleCount: number;
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const std = (a: number[], m: number) =>
  Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);

const statusFor = (z: number, direction: Direction): MetricBaseline["status"] => {
  const goodZ = direction === "lower" ? -z : direction === "higher" ? z : -Math.abs(z);
  // goodZ > 0 means better than baseline; < 0 means worse.
  if (goodZ >= -0.5) return "good";
  if (goodZ >= -1.5) return "ok";
  return "warn";
};

export const computeBaselines = async (
  userId: string,
  asOf: Date = new Date(),
  windowDays = 60,
): Promise<MetricBaseline[]> => {
  const endStr = format(asOf, "yyyy-MM-dd");
  const startStr = format(subDays(asOf, windowDays), "yyyy-MM-dd");

  const { data } = await supabase
    .from("health_samples")
    .select("sample_type, value, entry_date")
    .eq("user_id", userId)
    .gte("entry_date", startStr)
    .lte("entry_date", endStr)
    .in("sample_type", METRIC_CONFIGS.map((m) => m.key));

  const grouped = new Map<BaselineMetric, { value: number; entry_date: string }[]>();
  for (const row of data ?? []) {
    const k = row.sample_type as BaselineMetric;
    const arr = grouped.get(k) ?? [];
    arr.push({ value: Number(row.value), entry_date: row.entry_date });
    grouped.set(k, arr);
  }

  return METRIC_CONFIGS.map((cfg) => {
    const rows = (grouped.get(cfg.key) ?? [])
      .filter((r) => Number.isFinite(r.value))
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

    if (rows.length === 0) {
      return {
        key: cfg.key, latest: null, latestDate: null,
        mean: null, std: null, z: null, deviationPct: null,
        status: "low_data", sampleCount: 0,
      };
    }

    const latest = rows[0];
    // Baseline = previous samples (exclude today's value) so z reflects change vs history.
    const historic = rows.slice(1).map((r) => r.value);

    if (historic.length < 7) {
      return {
        key: cfg.key, latest: latest.value, latestDate: latest.entry_date,
        mean: null, std: null, z: null, deviationPct: null,
        status: "low_data", sampleCount: rows.length,
      };
    }

    const m = mean(historic);
    const s = std(historic, m);
    const z = s > 0 ? (latest.value - m) / s : 0;
    const deviationPct = m !== 0 ? ((latest.value - m) / m) * 100 : 0;

    return {
      key: cfg.key,
      latest: latest.value,
      latestDate: latest.entry_date,
      mean: m,
      std: s,
      z,
      deviationPct,
      status: statusFor(z, cfg.direction),
      sampleCount: rows.length,
    };
  });
};
