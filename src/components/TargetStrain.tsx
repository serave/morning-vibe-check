import { useEffect, useState } from "react";
import { Target, Flame, TrendingUp } from "lucide-react";
import { computeTargetStrain, type TargetStrainResult, type StrainBand } from "@/lib/targetStrain";

interface Props { userId: string }

const BAND_STYLE: Record<StrainBand, { ring: string; chip: string; label: string }> = {
  RECOVER: { ring: "text-rose-400", chip: "bg-rose-500/15 text-rose-300 border-rose-500/30", label: "Recover" },
  MAINTAIN: { ring: "text-amber-400", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30", label: "Maintain" },
  BUILD: { ring: "text-sky-400", chip: "bg-sky-500/15 text-sky-300 border-sky-500/30", label: "Build" },
  PEAK: { ring: "text-emerald-400", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", label: "Peak" },
};

const TargetStrain = ({ userId }: Props) => {
  const [data, setData] = useState<TargetStrainResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    computeTargetStrain(userId)
      .then((r) => { if (active) setData(r); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const style = BAND_STYLE[data.band];
  // bar % positions on a 0–21 scale
  const pct = (v: number) => `${(v / 21) * 100}%`;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className={`h-4 w-4 ${style.ring}`} />
          <h3 className="text-sm font-semibold">Today's target strain</h3>
        </div>
        <span className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${style.chip}`}>
          {style.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{data.targetMin}–{data.targetMax}</span>
        <span className="text-xs text-muted-foreground">
          recovery {data.recovery != null ? `${Math.round(data.recovery)}%` : "—"}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`absolute top-0 h-full ${style.ring.replace("text-", "bg-")}`}
          style={{ left: pct(data.targetMin), width: pct(data.targetMax - data.targetMin) }}
        />
        {data.yesterdayStrain > 0 && (
          <div
            className="absolute top-[-3px] h-[14px] w-0.5 bg-foreground/70"
            style={{ left: pct(data.yesterdayStrain) }}
            title={`Yesterday: ${data.yesterdayStrain.toFixed(1)}`}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>0</span><span>7</span><span>14</span><span>21</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/50 bg-background/40 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Flame className="h-3 w-3" /> yesterday
          </div>
          <div className="text-sm font-medium tabular-nums">{data.yesterdayStrain.toFixed(1)}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-background/40 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> 7-day avg
          </div>
          <div className="text-sm font-medium tabular-nums">
            {data.avgStrain7d != null ? data.avgStrain7d.toFixed(1) : "—"}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{data.rationale}</p>
    </div>
  );
};

export default TargetStrain;
