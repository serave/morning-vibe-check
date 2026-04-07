import { useEffect, useState } from "react";
import { Home, Calendar, BarChart3, Settings, ClipboardCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const staticTabs = [
  { to: "/app/history", icon: Calendar, label: "History" },
  { to: "/app/trends", icon: BarChart3, label: "Trends" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

const BottomNav = () => {
  const { user } = useAuth();
  const [checkedInToday, setCheckedInToday] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkToday = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("checkins")
        .select("id")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .limit(1)
        .maybeSingle();
      setCheckedInToday(!!data);
    };

    checkToday();

    // Re-check every 30s to handle midnight crossover
    const interval = setInterval(checkToday, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const firstTab = {
    to: "/app",
    icon: checkedInToday ? Home : ClipboardCheck,
    label: checkedInToday ? "Today" : "Check-In",
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg">
        {[firstTab, ...staticTabs].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
