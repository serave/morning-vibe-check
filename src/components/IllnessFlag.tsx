import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Activity } from "lucide-react";
import { detectIllness, type IllnessAssessment } from "@/lib/illness";

interface Props {
  userId: string;
}

const STYLE = {
  possible_illness: {
    bg: "bg-rose-500/10 border-rose-500/40",
    icon: "text-rose-400",
    Icon: ShieldAlert,
  },
  watch: {
    bg: "bg-amber-500/10 border-amber-500/40",
    icon: "text-amber-400",
    Icon: AlertTriangle,
  },
  minor: {
    bg: "bg-sky-500/10 border-sky-500/30",
    icon: "text-sky-400",
    Icon: Activity,
  },
} as const;

const IllnessFlag = ({ userId }: Props) => {
  const [data, setData] = useState<IllnessAssessment | null>(null);

  useEffect(() => {
    detectIllness(userId).then(setData);
  }, [userId]);

  if (!data || data.severity === "none") return null;
  const style = STYLE[data.severity];
  const Icon = style.Icon;

  return (
    <div className={`rounded-lg border p-4 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{data.title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{data.message}</p>
          <ul className="mt-2.5 space-y-1">
            {data.signals.map((s) => (
              <li key={s.key} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground">{s.label}</span>
                <span className="tabular-nums text-muted-foreground">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default IllnessFlag;
