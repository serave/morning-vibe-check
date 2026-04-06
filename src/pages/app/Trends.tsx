import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

const Trends = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: true })
      .limit(30)
      .then(({ data: rows }) => {
        const mapped = (rows ?? []).map((r) => ({
          date: format(new Date(r.entry_date + "T00:00:00"), "M/d"),
          recovery: r.recovery_score ?? 0,
          soreness: r.soreness,
          feeling: r.feeling,
          sleep: r.sleep_hours,
        }));
        setData(mapped);
        setLoading(false);
      });
  }, [user]);

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
    <div className="animate-slide-up px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-foreground">Trends</h1>

      <div className="mb-4 rounded-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recovery Score</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(231, 25%, 22%)" />
            <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#888", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1A1D2E", border: "1px solid #2a2d3e", borderRadius: 8, color: "#f0f0f0" }} />
            <Line type="monotone" dataKey="recovery" stroke="#3F8BFF" strokeWidth={2} dot={{ r: 3, fill: "#3F8BFF" }} name="Recovery" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Metrics Breakdown</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(231, 25%, 22%)" />
            <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} />
            <YAxis domain={[0, 5]} tick={{ fill: "#888", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1A1D2E", border: "1px solid #2a2d3e", borderRadius: 8, color: "#f0f0f0" }} />
            <Line type="monotone" dataKey="feeling" stroke="#34D399" strokeWidth={1.5} dot={false} name="Feeling" />
            <Line type="monotone" dataKey="soreness" stroke="#F87171" strokeWidth={1.5} dot={false} name="Soreness" />
            <Line type="monotone" dataKey="sleep" stroke="#3F8BFF" strokeWidth={1.5} dot={false} name="Sleep hrs" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Trends;
