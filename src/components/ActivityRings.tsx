interface ActivityRingsProps {
  steps: number | null;
  stepsGoal: number;
  activeKcal: number | null;
  activeGoal: number;
  standHours: number | null;
  standGoal: number;
  size?: number;
}

const RING_DEFS = [
  { key: "move", colorVar: "--ring-move", label: "Steps" },
  { key: "energy", colorVar: "--ring-energy", label: "Active kcal" },
  { key: "stand", colorVar: "--ring-stand", label: "Stand hrs" },
] as const;

const Ring = ({
  radius,
  stroke,
  progress,
  colorVar,
}: {
  radius: number;
  stroke: number;
  progress: number;
  colorVar: string;
}) => {
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(progress, 1));
  const overflow = Math.max(0, progress - 1);
  const overflowPct = Math.min(overflow, 1);
  const color = `hsl(var(${colorVar}))`;
  return (
    <g>
      {/* track */}
      <circle
        r={radius}
        fill="none"
        stroke={color}
        strokeOpacity={0.18}
        strokeWidth={stroke}
      />
      {/* primary progress */}
      <circle
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * pct} ${circumference}`}
        transform="rotate(-90)"
      />
      {/* overflow lap */}
      {overflow > 0 && (
        <circle
          r={radius}
          fill="none"
          stroke={color}
          strokeOpacity={0.65}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * overflowPct} ${circumference}`}
          transform="rotate(-90)"
        />
      )}
    </g>
  );
};

const ActivityRings = ({
  steps,
  stepsGoal,
  activeKcal,
  activeGoal,
  standHours,
  standGoal,
  size = 160,
}: ActivityRingsProps) => {
  const stroke = size * 0.11;
  const gap = stroke * 0.35;
  const outerR = size / 2 - stroke / 2;
  const midR = outerR - stroke - gap;
  const innerR = midR - stroke - gap;

  const stepsPct = stepsGoal > 0 ? (steps ?? 0) / stepsGoal : 0;
  const kcalPct = activeGoal > 0 ? (activeKcal ?? 0) / activeGoal : 0;
  const standPct = standGoal > 0 ? (standHours ?? 0) / standGoal : 0;

  const rings = [
    { r: outerR, p: stepsPct, colorVar: "--ring-move" },
    { r: midR, p: kcalPct, colorVar: "--ring-energy" },
    { r: innerR, p: standPct, colorVar: "--ring-stand" },
  ];

  const stats = [
    {
      colorVar: "--ring-move",
      label: "Steps",
      value: steps != null ? steps.toLocaleString() : "–",
      goal: stepsGoal.toLocaleString(),
    },
    {
      colorVar: "--ring-energy",
      label: "Active",
      value: activeKcal != null ? Math.round(activeKcal).toLocaleString() : "–",
      goal: `${activeGoal} kcal`,
    },
    {
      colorVar: "--ring-stand",
      label: "Stand",
      value: standHours != null ? `${standHours}` : "–",
      goal: `${standGoal} hr`,
    },
  ];

  return (
    <div className="flex items-center gap-5 rounded-lg bg-card p-4">
      <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
        {rings.map((r) => (
          <Ring
            key={r.colorVar}
            radius={r.r}
            stroke={stroke}
            progress={r.p}
            colorVar={r.colorVar}
          />
        ))}
      </svg>
      <div className="flex flex-1 flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `hsl(var(${s.colorVar}))` }}
              />
              {s.label}
            </span>
            <span className="text-xs tabular-nums text-foreground">
              <span className="font-semibold">{s.value}</span>
              <span className="text-muted-foreground"> / {s.goal}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityRings;
