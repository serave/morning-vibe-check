import { format } from "date-fns";

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
    notes: string | null;
  };
  streakCount: number;
}

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
