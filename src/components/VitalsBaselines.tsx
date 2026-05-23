import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { computeBaselines, METRIC_CONFIGS, type MetricBaseline } from "@/lib/baselines";

interface Props {
  userId: string;
}

const STATUS_COLOR: Record<MetricBaseline["status"], string> = {
  good: "text-emerald-400",
  ok: "text-amber-400",
  warn: "text-rose-400",
  low_data: "text-muted-foreground",
};

const formatVal = (v: number | null, decimals: number) =>
  v == null ? "–" : v.toFixed(decimals);

const VitalsBaselines = ({ userId }: Props) => {
  const [data, setData] = useState<MetricBaseline[] | null>(null);

  useEffect(() => {
    computeBaselines(userId).then(setData);
  }, [userId]);

  if (!data) return null;
  const hasAny = data.some((d) => d.latest != null);
  if (!hasAny) return null;

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Vitals vs 60-day baseline</h2>
      </div>
      <ul className="space-y-2.5">
        {data.map((m) => {
          const cfg = METRIC_CONFIGS.find((c) => c.key === m.key)!;
          const z = m.z;
          const Arrow = z == null ? Minus : z > 0.25 ? ArrowUp : z < -0.25 ? ArrowDown : Minus;
          const zStr = z == null ? "—" : `${z > 0 ? "+" : ""}${z.toFixed(1)}σ`;
          const baselineStr =
            m.mean != null ? `${m.mean.toFixed(cfg.decimals)} avg` : `${m.sampleCount}/7 days`;
          return (
            <li key={m.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{cfg.label}</p>
                <p className="text-[11px] text-muted-foreground">{baselineStr}</p>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums">
                <span className="text-sm font-semibold text-foreground">
                  {formatVal(m.latest, cfg.decimals)}
                </span>
                <span className="text-[11px] text-muted-foreground">{cfg.unit}</span>
              </div>
              <div className={`flex w-14 items-center justify-end gap-0.5 text-xs tabular-nums ${STATUS_COLOR[m.status]}`}>
                <Arrow className="h-3 w-3" />
                <span>{zStr}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
        Z-score = how far today's value is from your personal 60-day average. Color reflects whether the change is favorable for that metric.
      </p>
    </div>
  );
};

export default VitalsBaselines;
