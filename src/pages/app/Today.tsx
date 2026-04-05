import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CheckIn from "./CheckIn";
import Results from "./Results";

const Today = () => {
  const { user } = useAuth();
  const [todayCheckin, setTodayCheckin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchToday = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("checkin_date", today)
      .maybeSingle();
    setTodayCheckin(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchToday();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (todayCheckin) {
    return <Results checkin={todayCheckin} />;
  }

  return <CheckIn onComplete={fetchToday} />;
};

export default Today;
