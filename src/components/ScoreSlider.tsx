import { cn } from "@/lib/utils";

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  emoji?: string;
  lowLabel?: string;
  highLabel?: string;
  min?: number;
  max?: number;
}

const getRatingEmoji = (value: number, min: number = 1, max: number = 10) => {
  const pct = (value - min) / (max - min);
  if (pct <= 0.2) return "🤢";
  if (pct <= 0.4) return "👎";
  if (pct <= 0.6) return "👌";
  if (pct <= 0.8) return "👍";
  return "🎉";
};

const ScoreSlider = ({ label, value, onChange, emoji, lowLabel = "Low", highLabel = "High", min = 1, max = 10 }: ScoreSliderProps) => (
  <div className="rounded-lg bg-card p-4">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">
        {emoji && <span className="mr-2">{emoji}</span>}
        {label}
      </span>
      <span className="text-lg">{getRatingEmoji(value, min, max)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
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
