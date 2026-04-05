import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RecoveryScore, { calcRecoveryScore } from "@/components/RecoveryScore";
import { format } from "date-fns";

const History = () => {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setCheckins(data ?? []);
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

  return (
    <div className="animate-slide-up px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-foreground">History</h1>
      {checkins.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center rounded-lg bg-card">
          <p className="text-muted-foreground">No check-ins yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {checkins.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-card p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(c.checkin_date + "T00:00:00"), "EEE, MMM d")}
                </p>
                <p className="text-xs text-muted-foreground">{c.sleep_hours}h sleep</p>
              </div>
              <RecoveryScore
                sleepQuality={c.sleep_quality}
                energyLevel={c.energy_level}
                mood={c.mood}
                muscleSoreness={c.muscle_soreness}
                hydration={c.hydration}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
