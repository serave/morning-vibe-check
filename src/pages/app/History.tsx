import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
} from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CheckinSummary {
  entry_date: string;
  recovery_score: number | null;
  training_recommendation: string | null;
  id: string;
}

function scoreColor(score: number | null): string {
  if (score == null) return "#888888";
  if (score < 40) return "#F87171";
  if (score < 55) return "#FB923C";
  if (score < 70) return "#FBBF24";
  if (score < 85) return "#34D399";
  return "#3F8BFF";
}

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<CheckinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchCheckins = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("checkins")
      .select("id, entry_date, recovery_score, training_recommendation")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });
    setCheckins(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCheckins();
  }, [user]);

  const checkinMap = useMemo(() => {
    const map = new Map<string, CheckinSummary>();
    checkins.forEach((c) => map.set(c.entry_date, c));
    return map;
  }, [checkins]);

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedCheckin = selectedDate ? checkinMap.get(selectedDate) ?? null : null;

  const handleDayTap = (day: Date) => {
    if (isAfter(day, today)) return;
    const dateStr = format(day, "yyyy-MM-dd");
    if (checkinMap.has(dateStr)) {
      setSelectedDate(dateStr);
      setShowConfirm(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCheckin || !user) return;
    setDeleting(true);
    const { error } = await supabase
      .from("checkins")
      .delete()
      .eq("id", selectedCheckin.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSelectedDate(null);
      setShowConfirm(false);
      await fetchCheckins();
    }
    setDeleting(false);
  };

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

      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => {
            if (isBefore(monthEnd, today)) setCurrentMonth(addMonths(currentMonth, 1));
          }}
          className={`p-2 ${isBefore(monthEnd, today) ? "text-muted-foreground hover:text-foreground" : "pointer-events-none opacity-30"}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="pb-2 text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const checkin = checkinMap.get(dateStr);
          const inMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const isFuture = isAfter(day, today);
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayTap(day)}
              disabled={isFuture || !inMonth}
              className={`relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition-colors
                ${!inMonth ? "opacity-0 pointer-events-none" : ""}
                ${isFuture ? "text-muted-foreground/40 cursor-default" : "text-foreground"}
                ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                ${isSelected ? "bg-accent" : "hover:bg-accent/50"}
              `}
            >
              <span className="text-xs">{format(day, "d")}</span>
              {checkin && (
                <span
                  className="mt-0.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: scoreColor(checkin.recovery_score) }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom sheet overlay */}
      {selectedDate && selectedCheckin && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 animate-in fade-in"
            onClick={() => { setSelectedDate(null); setShowConfirm(false); }}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] min-h-[280px] flex-col rounded-t-2xl bg-card p-6 pb-8 shadow-lg animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

            <div className="flex-1 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d")}
                  </p>
                  {selectedCheckin.recovery_score != null ? (
                    <p className="mt-1 text-4xl font-bold" style={{ color: scoreColor(selectedCheckin.recovery_score) }}>
                      {Math.round(selectedCheckin.recovery_score)}
                    </p>
                  ) : (
                    <p className="mt-1 text-lg text-muted-foreground">No score</p>
                  )}
                </div>
                <button onClick={() => { setSelectedDate(null); setShowConfirm(false); }} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {selectedCheckin.training_recommendation && (
                <span className="mt-3 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                  {selectedCheckin.training_recommendation}
                </span>
              )}
            </div>

            {!showConfirm ? (
              <div className="mt-auto flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => navigate(`/app/edit/${selectedDate}`)}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => setShowConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            ) : (
              <div className="mt-auto pt-4">
                <p className="mb-3 text-sm text-foreground">
                  Delete this check-in? This will update your baseline.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}>
                    {deleting ? "Deleting…" : "Confirm"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default History;
