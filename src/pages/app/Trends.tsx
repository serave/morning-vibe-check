import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, Legend,
} from "recharts";
import { format, subDays } from "date-fns";

type Period = "7D" | "1M" | "3M" | "All";

const PERIODS: Period[] = ["7D", "1M", "3M", "All"];

function periodDays(p: Period): number | null {
  if (p === "7D") return 7;
  if (p === "1M") return 30;
  if (p === "3M") return 90;
  return null;
}

function scoreColor(v: number): string {
  if (v < 40) return "#F87171";
  if (v < 55) return "#FB923C";
  if (v < 70) return "#FBBF24";
  if (v < 85) return "#34D399";
  return "#3F8BFF";
}

function sleepColor(v: number): string {
  if (v < 6) return "#F87171";
  if (v < 7) return "#FBBF24";
  return "#34D399";
}

function rollingAvg(arr: (number | null)[], i: number, window: number): number | null {
  const slice = arr.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v != null);
  return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
}

function mean(arr: (number | null)[]): number | null {
  const valid = arr.filter((v): v is number => v != null);
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

const tooltipStyle = { background: "#1A1D2E", border: "1px solid #2a2d3e", borderRadius: 8, color: "#f0f0f0" };
const gridStroke = "hsl(231, 25%, 22%)";
const tickStyle = { fill: "#888", fontSize: 11 };

const CustomRecoveryDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload.recovery == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill={scoreColor(payload.recovery)} stroke="none" />;
};

const Trends = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("1M");
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("checkins")
      .select("entry_date, recovery_score, hrv_rmssd, sleep_hours, soreness, feeling")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: true });

    const days = periodDays(period);
    if (days) {
      const cutoff = format(subDays(new Date(), days), "yyyy-MM-dd");
      query = query.gte("entry_date", cutoff);
    }

    query.then(({ data: rows }) => {
      setRawData(rows ?? []);
      setLoading(false);
    });
  }, [user, period]);

  const data = useMemo(() => {
    const recoveries = rawData.map((r) => r.recovery_score as number | null);
    const hrvs = rawData.map((r) => r.hrv_rmssd as number | null);

    return rawData.map((r, i) => ({
      date: format(new Date(r.entry_date + "T00:00:00"), "M/d"),
      recovery: r.recovery_score ?? null,
      hrv: r.hrv_rmssd ?? null,
      sleep: r.sleep_hours ?? null,
      soreness: r.soreness ?? null,
      feeling: r.feeling ?? null,
      recoveryAvg7d: rollingAvg(recoveries, i, 7),
      hrvAvg10d: rollingAvg(hrvs, i, 10),
      sleepColor: r.sleep_hours != null ? sleepColor(r.sleep_hours) : "#888",
    }));
  }, [rawData]);

  const stats = useMemo(() => {
    const avgRecovery = mean(data.map((d) => d.recovery));
    const avgSleep = mean(data.map((d) => d.sleep));
    const avgHrv = mean(data.map((d) => d.hrv));
    return { avgRecovery, avgSleep, avgHrv, count: data.length };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="animate-slide-up px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-foreground">Trends</h1>
        <div className="flex h-[40vh] items-center justify-center rounded-lg bg-card">
          <p className="text-center text-muted-foreground">Need at least 2 check-ins to show trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-4 px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-foreground">Trends</h1>

      {/* Period Pills */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Avg Recovery", value: stats.avgRecovery != null ? `${Math.round(stats.avgRecovery)}%` : "–" },
          { label: "Avg Sleep", value: stats.avgSleep != null ? `${stats.avgSleep.toFixed(1)}h` : "–" },
          { label: "Avg HRV", value: stats.avgHrv != null ? `${Math.round(stats.avgHrv)}` : "–" },
          { label: "Days Logged", value: `${stats.count}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-card p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart 1 — Recovery Score */}
      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recovery Score</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="date" tick={tickStyle} />
            <YAxis domain={[0, 100]} tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="recovery"
              stroke="#3F8BFF"
              strokeWidth={2}
              dot={<CustomRecoveryDot />}
              name="Recovery"
            />
            <Line
              type="monotone"
              dataKey="recoveryAvg7d"
              stroke="#3F8BFF"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              dot={false}
              name="7d Avg"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2 — HRV */}
      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">HRV (RMSSD)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="date" tick={tickStyle} />
            <YAxis tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="hrv" stroke="#3F8BFF" strokeWidth={2} dot={{ r: 3, fill: "#3F8BFF" }} name="HRV" />
            <Line
              type="monotone"
              dataKey="hrvAvg10d"
              stroke="#3F8BFF"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              dot={false}
              name="10d Avg"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3 — Sleep Duration */}
      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Sleep Duration</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="date" tick={tickStyle} />
            <YAxis domain={[0, 12]} tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="sleep" name="Sleep hrs" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.sleepColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 4 — Soreness & Wellbeing */}
      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Soreness & Wellbeing</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="date" tick={tickStyle} />
            <YAxis domain={[1, 5]} tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="soreness" stroke="#F87171" strokeWidth={1.5} dot={false} name="Soreness" />
            <Line type="monotone" dataKey="feeling" stroke="#34D399" strokeWidth={1.5} dot={false} name="Feeling" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Trends;
