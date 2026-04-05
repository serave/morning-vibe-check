import { cn } from "@/lib/utils";

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  emoji?: string;
  lowLabel?: string;
  highLabel?: string;
}

const getColor = (value: number) => {
  if (value <= 3) return "text-destructive";
  if (value <= 5) return "text-warning";
  if (value <= 7) return "text-foreground";
  return "text-success";
};

const ScoreSlider = ({ label, value, onChange, emoji, lowLabel = "Low", highLabel = "High" }: ScoreSliderProps) => (
  <div className="rounded-lg bg-card p-4">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">
        {emoji && <span className="mr-2">{emoji}</span>}
        {label}
      </span>
      <span className={cn("text-lg font-bold tabular-nums", getColor(value))}>{value}</span>
    </div>
    <input
      type="range"
      min={1}
      max={10}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary"
      style={{ height: "48px" }}
    />
    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
      <span>{lowLabel}</span>
      <span>{highLabel}</span>
    </div>
  </div>
);

export default ScoreSlider;
