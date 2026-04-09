import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ScoreSlider from "@/components/ScoreSlider";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown } from "lucide-react";
import { calculateRecovery } from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EditCheckin = () => {
  const { date } = useParams<{ date: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [hrvRmssd, setHrvRmssd] = useState<string>("");
  const [sleepHours, setSleepHours] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [feeling, setFeeling] = useState(3);
  const [trainedYesterday, setTrainedYesterday] = useState(false);
  const [sport, setSport] = useState("");
  const [trainingIntensity, setTrainingIntensity] = useState(5);
  const [trainingDuration, setTrainingDuration] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !date) return;
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("entry_date", date)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          toast({ title: "Not found", description: "No check-in found for this date.", variant: "destructive" });
          navigate("/app/history");
          return;
        }
        setCheckinId(data.id);
        setHrvRmssd(data.hrv_rmssd != null ? String(data.hrv_rmssd) : "");
        setSleepHours(data.sleep_hours ?? 7);
        setSoreness(data.soreness ?? 3);
        setFeeling(data.feeling ?? 3);
        setTrainedYesterday(data.trained_yesterday ?? false);
        setSport(data.sport ?? "");
        setTrainingIntensity(data.training_intensity ?? 5);
        setTrainingDuration(data.training_duration_min != null ? String(data.training_duration_min) : "");
        setLoading(false);
      });
  }, [user, date]);

  const hrvValue = hrvRmssd ? Number(hrvRmssd) : null;
  const showHrvWarning = hrvRmssd !== "" && hrvValue !== null && (hrvValue < 10 || hrvValue > 200);
  const isSubmitDisabled = saving || !hrvValue || hrvValue <= 0;

  const handleSave = async () => {
    if (!user || !checkinId || !date) return;
    setSaving(true);
    const { error } = await supabase
      .from("checkins")
      .update({
        hrv_rmssd: hrvValue,
        sleep_hours: sleepHours,
        soreness,
        feeling,
        trained_yesterday: trainedYesterday,
        sport: trainedYesterday && sport ? sport : null,
        training_intensity: trainedYesterday ? trainingIntensity : null,
        training_duration_min: trainedYesterday && trainingDuration ? Number(trainingDuration) : null,
      })
      .eq("id", checkinId);

    if (error) {
      setSaving(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    try {
      await calculateRecovery(user.id, date);
      navigate("/app");
    } catch (err) {
      console.error("Recovery calculation failed:", err);
      toast({ title: "Calculation failed", description: "Could not recalculate recovery score.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const formattedDate = date ? format(new Date(date + "T00:00:00"), "EEE, MMM d") : "";

  return (
    <div className="animate-slide-up px-4 py-6">
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Edit Check-In</h1>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
      </div>

      <div className="flex flex-col gap-3">
        {/* HRV */}
        <div className="rounded-lg bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">💓 HRV (RMSSD)</span>
          </div>
          <Input
            type="number"
            min={0}
            max={200}
            placeholder="e.g. 55"
            value={hrvRmssd}
            onChange={(e) => setHrvRmssd(e.target.value)}
            className="bg-secondary text-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">Enter your RMSSD in milliseconds (ms)</p>
          {showHrvWarning && (
            <p className="mt-2 text-xs text-warning">⚠️ Typical RMSSD is between 10–200 ms. Double-check your device.</p>
          )}
        </div>

        {/* Sleep */}
        <div className="rounded-lg bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">😴 Sleep Hours</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{sleepHours}h</span>
          </div>
          <input
            type="range"
            min={3}
            max={12}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-full accent-primary"
            style={{ height: "48px" }}
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>3h</span>
            <span>12h</span>
          </div>
        </div>

        <ScoreSlider label="Soreness" emoji="💪" value={soreness} onChange={setSoreness} lowLabel="None" highLabel="Extreme" min={1} max={5} />
        <ScoreSlider label="Feeling" emoji="😊" value={feeling} onChange={setFeeling} lowLabel="Terrible" highLabel="Great" min={1} max={5} />

        {/* Yesterday's Training */}
        <div className="rounded-lg bg-card p-4">
          <button
            type="button"
            onClick={() => setTrainedYesterday(!trainedYesterday)}
            className="flex w-full items-center justify-between"
          >
            <span className="text-sm font-medium text-foreground">🏃 Yesterday's Training</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                trainedYesterday && "rotate-180"
              )}
            />
          </button>

          {trainedYesterday && (
            <div className="mt-4 flex animate-fade-in flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Sport / Activity</label>
                <Input
                  type="text"
                  placeholder="e.g. Cycling, Running"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="bg-secondary text-foreground"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Intensity</label>
                  <span className="text-sm font-bold tabular-nums text-foreground">{trainingIntensity}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={trainingIntensity}
                  onChange={(e) => setTrainingIntensity(Number(e.target.value))}
                  className="w-full accent-primary"
                  style={{ height: "48px" }}
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Very Easy</span>
                  <span>All-Out</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Duration</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Duration (minutes)"
                  value={trainingDuration}
                  onChange={(e) => setTrainingDuration(e.target.value)}
                  className="bg-secondary text-foreground"
                />
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={isSubmitDisabled} className="mt-2 h-14 w-full rounded-sm text-base font-semibold">
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default EditCheckin;
