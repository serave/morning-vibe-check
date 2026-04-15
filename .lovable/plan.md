

## Plan: Replace Today.tsx with ref-guarded fetch logic

The user's pasted code was truncated, but the intent is clear from context: replace `Today.tsx` to use `useRef` instead of `useLocation` to prevent re-fetching loops, initialize `todayCheckin` as `undefined` (to distinguish "not yet fetched" from "no checkin"), and add `notes` to the select query.

**File:** `src/pages/app/Today.tsx` — full replacement:

```typescript
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CheckIn from "./CheckIn";
import Results from "./Results";

const Today = () => {
  const { user } = useAuth();
  const [todayCheckin, setTodayCheckin] = useState<any>(undefined);
  const [streakCount, setStreakCount] = useState<number>(0);
  const fetchedRef = useRef(false);

  const fetchToday = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const [checkinRes, profileRes] = await Promise.all([
      supabase
        .from("checkins")
        .select("entry_date, sleep_hours, soreness, feeling, recovery_score, training_recommendation, sleep_score, soreness_score, wellbeing_score, hrv_score, lowest_factor, baseline_phase, notes")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("streak_count")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    setTodayCheckin(checkinRes.data ?? null);
    setStreakCount(profileRes.data?.streak_count ?? 0);
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

  if (todayCheckin) {
    return <Results checkin={todayCheckin} streakCount={streakCount} />;
  }

  return <CheckIn onComplete={() => { fetchedRef.current = false; fetchToday(); }} />;
};

export default Today;
```

**Key changes:**
- Removes `useLocation` dependency — no more re-fetch on every navigation
- Uses `useRef(false)` to ensure fetch runs only once per mount
- Initializes state as `undefined` to distinguish loading from "no checkin"
- Adds `notes` to the select query
- `onComplete` resets the ref and re-fetches so Results show after submission

