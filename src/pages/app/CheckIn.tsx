import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface CheckInProps {
  onComplete: () => void;
}

const CheckIn = ({ onComplete }: CheckInProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hrvRmssd, setHrvRmssd] = useState<string>("");
  const [sleepHours, setSleepHours] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [feeling, setFeeling] = useState(3);
  const [sorenessSet, setSorenessSet] = useState(false);
  const [feelingSet, setFeelingSet] = useState(false);
  const [trainedYesterday, setTrainedYesterday] = useState(false);
  const [sport, setSport] = useState("");
  const [trainingIntensity, setTrainingIntensity] = useState(5);
  const [trainingDuration, setTrainingDuration] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const hrvValue = hrvRmssd ? Number(hrvRmssd) : null;
  const showHrvWarning = hrvRmssd !== "" && hrvValue !== null && (hrvValue < 10 || hrvValue > 200);
  const isSubmitDisabled = loading || !hrvValue || hrvValue <= 0 || !sorenessSet || !feelingSet;

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    console.log('Starting submit', { userId: user?.id });
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      entry_date: new Date().toISOString().split("T")[0],
      hrv_rmssd: hrvValue,
      sleep_hours: sleepHours,
      soreness,
      feeling,
      trained_yesterday: trainedYesterday,
      sport: trainedYesterday && sport ? sport : null,
      training_intensity: trainedYesterday ? trainingIntensity : null,
      training_duration_min: trainedYesterday && trainingDuration ? Number(trainingDuration) : null,
    });
    if (error) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    console.log('Insert success, calling calculateRecovery');
    try {
      const entryDate = format(new Date(), "yyyy-MM-dd");
      console.log('Calling calculateRecovery with:', { userId: user?.id, entryDate });
      await calculateRecovery(user.id, entryDate);
      console.log('calculateRecovery success');
      navigate('/app');
    } catch (err) {
      console.error("Recovery calculation failed:", err);
      toast({ title: "Calculation failed", description: "Could not calculate recovery score.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-xl font-bold text-foreground">Good Morning 🌅</h1>
        <p className="text-sm text-muted-foreground">How are you feeling today?</p>
      </div>

      <div className="flex flex-col gap-3">
        {/* HRV (RMSSD) */}
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
          <p className="mt-2 text-xs text-muted-foreground">
            Enter your RMSSD in milliseconds (ms)
          </p>
          {showHrvWarning && (
            <p className="mt-2 text-xs text-warning">
              ⚠️ Typical RMSSD is between 10–200 ms. Double-check your device.
            </p>
          )}
        </div>

        {/* Sleep hours */}
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

        <ScoreSlider label="Soreness" emoji="💪" value={soreness} onChange={(v) => { setSoreness(v); setSorenessSet(true); }} lowLabel="None" highLabel="Extreme" min={1} max={5} />
        <ScoreSlider label="Feeling" emoji="😊" value={feeling} onChange={(v) => { setFeeling(v); setFeelingSet(true); }} lowLabel="Terrible" highLabel="Great" min={1} max={5} />

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
              {/* Sport/Activity */}
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

              {/* Intensity */}
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

              {/* Duration */}
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

        <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="mt-2 h-14 w-full rounded-sm text-base font-semibold">
          {loading ? "Saving…" : "Submit Check-In"}
        </Button>
      </div>
    </div>
  );
};

export default CheckIn;
