import { cn } from "@/lib/utils";

interface RecoveryScoreProps {
  sleepQuality: number;
  energyLevel: number;
  mood: number;
  muscleSoreness: number;
  hydration: number;
  size?: "sm" | "lg";
}

export const calcRecoveryScore = (data: { sleep_quality: number; energy_level: number; mood: number; muscle_soreness: number; hydration: number }) => {
  const soreness = 11 - data.muscle_soreness; // invert: 1=bad soreness → 10 contribution, 10=no soreness → 1 contribution... wait, flip:
  // muscle_soreness 1 = not sore (good), 10 = very sore (bad) → invert for score
  const adjustedSoreness = 11 - data.muscle_soreness;
  const raw = (data.sleep_quality + data.energy_level + data.mood + adjustedSoreness + data.hydration) / 5;
  return Math.round(raw * 10);
};

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 40) return "Low";
  return "Poor";
};

const RecoveryScore = ({ sleepQuality, energyLevel, mood, muscleSoreness, hydration, size = "lg" }: RecoveryScoreProps) => {
  const score = calcRecoveryScore({
    sleep_quality: sleepQuality,
    energy_level: energyLevel,
    mood,
    muscle_soreness: muscleSoreness,
    hydration,
  });

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("font-bold tabular-nums", getScoreColor(score), size === "lg" ? "text-5xl" : "text-2xl")}>
        {score}
      </span>
      <span className={cn("font-medium", getScoreColor(score), size === "lg" ? "text-base" : "text-xs")}>
        {getScoreLabel(score)}
      </span>
      {size === "lg" && <span className="text-xs text-muted-foreground">Recovery Score</span>}
    </div>
  );
};

export default RecoveryScore;
