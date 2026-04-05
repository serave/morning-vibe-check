import RecoveryScore from "@/components/RecoveryScore";
import { format } from "date-fns";

interface ResultsProps {
  checkin: {
    checkin_date: string;
    sleep_hours: number;
    sleep_quality: number;
    muscle_soreness: number;
    energy_level: number;
    mood: number;
    hydration: number;
    notes: string | null;
  };
}

const MetricRow = ({ label, value, max = 10 }: { label: string; value: number; max?: number }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  </div>
);

const Results = ({ checkin }: ResultsProps) => (
  <div className="animate-slide-up px-4 py-6">
    <div className="mb-6 text-center">
      <p className="text-sm text-muted-foreground">{format(new Date(checkin.checkin_date + "T00:00:00"), "EEEE, MMMM d")}</p>
      <h1 className="mt-1 text-xl font-bold text-foreground">Today's Check-In</h1>
    </div>

    <div className="mb-6 flex justify-center rounded-lg bg-card p-6">
      <RecoveryScore
        sleepQuality={checkin.sleep_quality}
        energyLevel={checkin.energy_level}
        mood={checkin.mood}
        muscleSoreness={checkin.muscle_soreness}
        hydration={checkin.hydration}
      />
    </div>

    <div className="rounded-lg bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Metrics</h2>
      <MetricRow label="😴 Sleep Hours" value={checkin.sleep_hours} max={12} />
      <MetricRow label="🛏️ Sleep Quality" value={checkin.sleep_quality} />
      <MetricRow label="💪 Soreness" value={checkin.muscle_soreness} />
      <MetricRow label="⚡ Energy" value={checkin.energy_level} />
      <MetricRow label="😊 Mood" value={checkin.mood} />
      <MetricRow label="💧 Hydration" value={checkin.hydration} />
    </div>

    {checkin.notes && (
      <div className="mt-3 rounded-lg bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Notes</h2>
        <p className="text-sm text-muted-foreground">{checkin.notes}</p>
      </div>
    )}
  </div>
);

export default Results;
