import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getTodayHealth, type TodayHealth } from "@/lib/health";
import ActivityRings from "@/components/ActivityRings";
import VitalsBaselines from "@/components/VitalsBaselines";
import CheckIn from "./CheckIn";
import Results from "./Results";

interface Goals {
  steps_goal: number;
  active_energy_goal: number;
  stand_goal: number;
}

const DEFAULT_GOALS: Goals = { steps_goal: 10000, active_energy_goal: 500, stand_goal: 12 };

const Today = () => {
  const { user } = useAuth();
  const [todayCheckin, setTodayCheckin] = useState<any>(undefined);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [health, setHealth] = useState<TodayHealth | null>(null);
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const fetchedRef = useRef(false);

  const fetchToday = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const [checkinRes, profileRes, h] = await Promise.all([
      supabase
        .from("checkins")
        .select("entry_date, sleep_hours, soreness, feeling, recovery_score, training_recommendation, sleep_score, soreness_score, wellbeing_score, hrv_score, lowest_factor, baseline_phase, notes, strain_score")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("streak_count, steps_goal, active_energy_goal, stand_goal")
        .eq("id", user.id)
        .maybeSingle(),
      getTodayHealth(user.id),
    ]);
    setTodayCheckin(checkinRes.data ?? null);
    setStreakCount(profileRes.data?.streak_count ?? 0);
    setGoals({
      steps_goal: profileRes.data?.steps_goal ?? DEFAULT_GOALS.steps_goal,
      active_energy_goal: profileRes.data?.active_energy_goal ?? DEFAULT_GOALS.active_energy_goal,
      stand_goal: profileRes.data?.stand_goal ?? DEFAULT_GOALS.stand_goal,
    });
    setHealth(h);
  };

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchToday();
  }, [user]);

  if (todayCheckin === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const showRings =
    health &&
    (health.steps != null || health.active_energy_kcal != null || health.stand_hours != null);

  const ringsCard = showRings ? (
    <div className="px-4 pt-4">
      <ActivityRings
        steps={health!.steps}
        stepsGoal={goals.steps_goal}
        activeKcal={health!.active_energy_kcal}
        activeGoal={goals.active_energy_goal}
        standHours={health!.stand_hours}
        standGoal={goals.stand_goal}
      />
    </div>
  ) : null;

  if (todayCheckin) {
    return (
      <>
        {ringsCard}
        <Results checkin={todayCheckin} streakCount={streakCount} />
      </>
    );
  }

  return (
    <>
      {ringsCard}
      <CheckIn onComplete={() => { fetchedRef.current = false; fetchToday(); }} />
    </>
  );
};

export default Today;
