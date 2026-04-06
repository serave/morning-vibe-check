import { format } from "date-fns";

interface ResultsProps {
  checkin: {
    entry_date: string;
    sleep_hours: number;
    soreness: number | null;
    feeling: number | null;
    recovery_score: number | null;
    notes: string | null;
  };
}

const MetricRow = ({ label, value, max = 5 }: { label: string; value: number; max?: number }) => (
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
      <p className="text-sm text-muted-foreground">{format(new Date(checkin.entry_date + "T00:00:00"), "EEEE, MMMM d")}</p>
      <h1 className="mt-1 text-xl font-bold text-foreground">Today's Check-In</h1>
    </div>

    {checkin.recovery_score != null && (
      <div className="mb-6 flex justify-center rounded-lg bg-card p-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-5xl font-bold tabular-nums text-primary">{Math.round(checkin.recovery_score)}</span>
          <span className="text-xs text-muted-foreground">Recovery Score</span>
        </div>
      </div>
    )}

    <div className="rounded-lg bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Metrics</h2>
      <MetricRow label="😴 Sleep Hours" value={checkin.sleep_hours} max={12} />
      {checkin.soreness != null && <MetricRow label="💪 Soreness" value={checkin.soreness} />}
      {checkin.feeling != null && <MetricRow label="😊 Feeling" value={checkin.feeling} />}
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
