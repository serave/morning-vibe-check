import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Workout {
  id: string;
  activity_type: string | null;
  start_at: string;
  duration_min: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  strain: number | null;
  zone1_min: number | null;
  zone2_min: number | null;
  zone3_min: number | null;
  zone4_min: number | null;
  zone5_min: number | null;
}

const ZONE_META = [
  { key: "zone1_min", label: "Z1", desc: "Recovery (<60% max HR)", color: "#9CA3AF", weight: "×1" },
  { key: "zone2_min", label: "Z2", desc: "Endurance (60–70%)", color: "#34D399", weight: "×2" },
  { key: "zone3_min", label: "Z3", desc: "Tempo (70–80%)", color: "#FBBF24", weight: "×3" },
  { key: "zone4_min", label: "Z4", desc: "Threshold (80–90%)", color: "#FB923C", weight: "×4" },
  { key: "zone5_min", label: "Z5", desc: "Max (>90%)", color: "#F87171", weight: "×5" },
] as const;

const WorkoutZoneBreakdown = ({ userId, date }: { userId: string; date: string }) => {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("health_workouts")
        .select("id, activity_type, start_at, duration_min, avg_hr, max_hr, strain, zone1_min, zone2_min, zone3_min, zone4_min, zone5_min")
        .eq("user_id", userId)
        .eq("entry_date", date)
        .order("start_at", { ascending: true });
      if (!cancelled) setWorkouts((data as Workout[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [userId, date]);

  if (!workouts || workouts.length === 0) return null;

  // Aggregate totals
  const totals = ZONE_META.map((z) => ({
    ...z,
    min: workouts.reduce((s, w) => s + (Number(w[z.key as keyof Workout]) || 0), 0),
  }));
  const totalMin = totals.reduce((s, z) => s + z.min, 0);
  const weightedLoad = totals.reduce((s, z, i) => s + z.min * (i + 1), 0);

  return (
    <div className="rounded-lg bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-foreground">Strain Breakdown</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Time in each HR zone is weighted (Z1×1 → Z5×5) and mapped through a logarithmic curve to a 0–21 score.
      </p>

      {/* Stacked zone bar */}
      {totalMin > 0 && (
        <>
          <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-secondary">
            {totals.map((z) =>
              z.min > 0 ? (
                <div
                  key={z.key}
                  style={{ width: `${(z.min / totalMin) * 100}%`, backgroundColor: z.color }}
                  title={`${z.label}: ${z.min.toFixed(0)} min`}
                />
              ) : null,
            )}
          </div>
          <div className="mb-4 space-y-1">
            {totals.map((z) => (
              <div key={z.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: z.color }} />
                  <span className="font-medium text-foreground">{z.label}</span>
                  <span className="text-muted-foreground">{z.desc}</span>
                </span>
                <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                  <span>{z.min.toFixed(0)} min</span>
                  <span className="w-6 text-right">{z.weight}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mb-4 flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Weighted load</span>
            <span className="font-medium tabular-nums text-foreground">
              {weightedLoad.toFixed(0)} pts → strain {(21 * (1 - Math.exp(-weightedLoad / 70))).toFixed(1)}
            </span>
          </div>
        </>
      )}

      {/* Per-workout list */}
      <div className="space-y-2">
        {workouts.map((w) => {
          const wTotalMin = ZONE_META.reduce((s, z) => s + (Number(w[z.key as keyof Workout]) || 0), 0);
          return (
            <div key={w.id} className="rounded-md border border-border/50 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {w.activity_type || "Workout"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(w.start_at), "h:mm a")} · {Math.round(Number(w.duration_min) || 0)} min
                    {w.avg_hr ? ` · avg ${Math.round(Number(w.avg_hr))} bpm` : ""}
                    {w.max_hr ? ` · max ${Math.round(Number(w.max_hr))} bpm` : ""}
                  </p>
                </div>
                {w.strain != null && (
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {Number(w.strain).toFixed(1)}
                  </span>
                )}
              </div>
              {wTotalMin > 0 ? (
                <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                  {ZONE_META.map((z) => {
                    const m = Number(w[z.key as keyof Workout]) || 0;
                    return m > 0 ? (
                      <div
                        key={z.key}
                        style={{ width: `${(m / wTotalMin) * 100}%`, backgroundColor: z.color }}
                        title={`${z.label}: ${m.toFixed(0)} min`}
                      />
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="text-[10px] italic text-muted-foreground">
                  No HR data — strain estimated from duration.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ResultsProps {
  checkin: {
    entry_date: string;
    sleep_hours: number;
    soreness: number | null;
    feeling: number | null;
    recovery_score: number | null;
    training_recommendation: string | null;
    sleep_score: number | null;
    soreness_score: number | null;
    wellbeing_score: number | null;
    hrv_score: number | null;
    lowest_factor: string | null;
    baseline_phase: string | null;
    hrv_deviation?: number | null;
    strain_score?: number | null;
    notes: string | null;
  };
  streakCount: number;
}

const getStrainColor = (s: number): string => {
  if (s < 8) return "#34D399";
  if (s < 14) return "#FBBF24";
  if (s < 18) return "#FB923C";
  return "#F87171";
};

const getStrainLabel = (s: number): string => {
  if (s < 8) return "Light";
  if (s < 14) return "Moderate";
  if (s < 18) return "Strenuous";
  return "All-Out";
};

const getZoneColor = (score: number | null): string => {
  if (score == null) return "#888";
  if (score < 40) return "#F87171";
  if (score < 55) return "#FB923C";
  if (score < 70) return "#FBBF24";
  if (score < 85) return "#34D399";
  return "#3F8BFF";
};

const recMap: Record<string, { emoji: string; label: string; context: string }> = {
  GO_HARD: { emoji: "💪", label: "Go Hard Today", context: "Your body is primed. Push hard today." },
  NORMAL: { emoji: "✅", label: "Normal Workout", context: "Well recovered. Train as planned." },
  ENDURANCE: { emoji: "🚴", label: "Light / Endurance", context: "Moderate readiness. Keep it aerobic." },
  EASY: { emoji: "🔄", label: "Easy Recovery", context: "Below average recovery. Move gently today." },
  REST: { emoji: "😴", label: "Rest Day", context: "Your body needs rest. No training today." },
};

const ScoreBar = ({
  label,
  score,
  weight,
}: {
  label: string;
  score: number | null;
  weight: string;
}) => {
  const val = score ?? 0;
  const color = getZoneColor(score);
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${val}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-10 text-right text-xs font-medium tabular-nums text-foreground">
          {score != null ? Math.round(val) : "–"}/100
        </span>
        <span className="w-8 text-right text-xs text-muted-foreground">{weight}</span>
      </div>
    </div>
  );
};

const Results = ({ checkin, streakCount }: ResultsProps) => {
  const { user } = useAuth();
  const score = checkin.recovery_score;
  const phase = checkin.baseline_phase;
  const zoneColor = getZoneColor(score);
  const rec = checkin.training_recommendation
    ? recMap[checkin.training_recommendation]
    : null;
  const isOnboarding = phase === "ONBOARDING";
  const isEarly = phase === "EARLY";
  const hrvWeight = phase === "ONBOARDING" || phase === "EARLY" ? "25%" : "40%";

  return (
    <div className="animate-slide-up space-y-3 px-4 py-6">
      {/* Date header */}
      <p className="text-center text-sm text-muted-foreground">
        {format(new Date(checkin.entry_date + "T00:00:00"), "EEEE, MMMM d")}
      </p>

      {/* 1. Recovery Score */}
      <div className="flex flex-col items-center gap-1 rounded-lg bg-card p-6">
        {isOnboarding ? (
          <span className="text-lg font-semibold text-muted-foreground">Building baseline…</span>
        ) : (
          <>
            <span className="text-5xl font-bold tabular-nums" style={{ color: zoneColor }}>
              {score != null ? Math.round(score) : "–"}
            </span>
            <span className="text-xs text-muted-foreground">Recovery Score</span>
            {isEarly && (
              <span className="mt-1 rounded-full bg-[#FBBF24]/20 px-2 py-0.5 text-[10px] font-medium text-[#FBBF24]">
                Low Confidence
              </span>
            )}
          </>
        )}
      </div>

      {/* 2. Training Recommendation */}
      {rec && (
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: `${zoneColor}26` }}
        >
          <p className="text-lg font-bold text-foreground">
            {rec.emoji} {rec.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{rec.context}</p>
        </div>
      )}

      {/* Day Strain (0–21) */}
      {checkin.strain_score != null && Number(checkin.strain_score) > 0 && (() => {
        const s = Number(checkin.strain_score);
        const c = getStrainColor(s);
        return (
          <div className="rounded-lg bg-card p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-foreground">⚡ Day Strain</span>
              <span className="text-xs text-muted-foreground">{getStrainLabel(s)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums" style={{ color: c }}>
                {s.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">/ 21</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(s / 21) * 100}%`, backgroundColor: c }}
              />
            </div>
          </div>
        );
      })()}

      {/* 3. Illness banner */}
      {checkin.feeling === 1 && (
        <div className="rounded-lg bg-[#F87171]/15 px-4 py-3">
          <p className="text-sm font-medium text-[#F87171]">
            You may be feeling unwell. Rest is always right when sick.
          </p>
        </div>
      )}

      {/* 4. Score Breakdown */}
      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Score Breakdown</h2>
        <ScoreBar label="❤️ HRV" score={checkin.hrv_score} weight={hrvWeight} />
        <ScoreBar label="😴 Sleep" score={checkin.sleep_score} weight="30%" />
        <ScoreBar label="😊 Feeling" score={checkin.wellbeing_score} weight="20%" />
        <ScoreBar label="💪 Soreness" score={checkin.soreness_score} weight="10%" />
      </div>

      {/* 5. Lowest factor */}
      {score != null && score < 70 && checkin.lowest_factor && (
        <div className="rounded-lg bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            📊 <span className="font-medium text-foreground">{checkin.lowest_factor}</span> was your lowest-scoring factor today.
          </p>
        </div>
      )}

      {/* 6. HRV context */}
      {checkin.hrv_deviation != null && Math.abs(checkin.hrv_deviation) > 2 && (
        <div className="rounded-lg bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {checkin.hrv_deviation > 2
              ? "ℹ️ HRV notably above your average."
              : "⚠️ HRV notably below your average — strong stress signal."}
          </p>
        </div>
      )}

      {/* 7. Streak */}
      {streakCount >= 2 && (
        <div className="rounded-lg bg-card px-4 py-3 text-center">
          <p className="text-sm font-medium text-foreground">
            🔥 {streakCount}-day streak{streakCount >= 7 ? " — Keep it up!" : ""}
          </p>
        </div>
      )}

      {/* Notes */}
      {checkin.notes && (
        <div className="rounded-lg bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Notes</h2>
          <p className="text-sm text-muted-foreground">{checkin.notes}</p>
        </div>
      )}
    </div>
  );
};

export default Results;
