import { useEffect, useState } from "react";
import { Moon, BedDouble, TrendingDown, Flame } from "lucide-react";
import { computeSleepNeed, type SleepNeedResult } from "@/lib/sleepNeed";

interface Props { userId: string }

const fmtH = (h: number | null | undefined) =>
  h == null ? "—" : `${h.toFixed(1)}h`;

const SleepNeed = ({ userId }: Props) => {
  const [data, setData] = useState<SleepNeedResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    computeSleepNeed(userId)
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

  const pctOfNeed = data.lastNightH != null
    ? Math.min(100, (data.lastNightH / data.totalNeedH) * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Sleep need tonight</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">{data.totalNeedH.toFixed(1)}h</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">target</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Last night: {fmtH(data.lastNightH)}</span>
          <span>Need: {data.totalNeedH.toFixed(1)}h</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pctOfNeed}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border/50 bg-background/40 p-2">
          <BedDouble className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-1" />
          <div className="text-sm font-medium tabular-nums">{data.baseNeedH.toFixed(1)}h</div>
          <div className="text-[10px] text-muted-foreground">base</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-background/40 p-2">
          <Flame className="mx-auto h-3.5 w-3.5 text-orange-400 mb-1" />
          <div className="text-sm font-medium tabular-nums">+{(data.strainAddH * 60).toFixed(0)}m</div>
          <div className="text-[10px] text-muted-foreground">strain {data.yesterdayStrain.toFixed(1)}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-background/40 p-2">
          <TrendingDown className="mx-auto h-3.5 w-3.5 text-rose-400 mb-1" />
          <div className="text-sm font-medium tabular-nums">+{(data.debtAddH * 60).toFixed(0)}m</div>
          <div className="text-[10px] text-muted-foreground">debt {data.debt7dH.toFixed(1)}h</div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{data.recommendation}</p>
    </div>
  );
};

export default SleepNeed;
