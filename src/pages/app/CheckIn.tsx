import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ScoreSlider from "@/components/ScoreSlider";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown } from "lucide-react";
import { calculateRecovery } from "@/lib/api";
import { analyzeSentiment } from "@/lib/gemini";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CheckInProps {
  onComplete: () => void;
}

const NOTES_MAX = 500;

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
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzingNote, setAnalyzingNote] = useState(false);

  const hrvValue = hrvRmssd ? Number(hrvRmssd) : null;
  const showHrvWarning = hrvRmssd !== "" && hrvValue !== null && (hrvValue < 10 || hrvValue > 200);
  const isSubmitDisabled = loading || !hrvValue || hrvValue <= 0 || !sorenessSet || !feelingSet;

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    const entryDate = format(new Date(), "yyyy-MM-dd");
    const trimmedNotes = notes.trim();

    // 1. Insert the checkin row
    const { data: inserted, error } = await supabase
      .from("checkins")
      .insert({
        user_id: user.id,
        entry_date: entryDate,
        hrv_rmssd: hrvValue,
        sleep_hours: sleepHours,
        soreness,
        feeling,
        trained_yesterday: trainedYesterday,
        sport: trainedYesterday && sport ? sport : null,
        training_intensity: trainedYesterday ? trainingIntensity : null,
        training_duration_min: trainedYesterday && trainingDuration ? Number(trainingDuration) : null,
        notes: trimmedNotes || null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      setLoading(false);
      toast({ title: "Error", description: error?.message || "Failed to save check-in", variant: "destructive" });
      return;
    }

    // 2. Calculate recovery score
    try {
      await calculateRecovery(user.id, entryDate);
    } catch (err) {
      console.error("Recovery calculation failed:", err);
      toast({ title: "Calculation failed", description: "Could not calculate recovery score.", variant: "destructive" });
    }

    // 3. If notes exist, run sentiment analysis and update the row
    if (trimmedNotes) {
      setAnalyzingNote(true);
      try {
        const sentimentScore = await analyzeSentiment(trimmedNotes);
        const sentimentLabel = sentimentScore > 0.3 ? "positive" : sentimentScore < -0.3 ? "negative" : "neutral";

        // Fetch current wellbeing_score to adjust it
        const { data: current } = await supabase
          .from("checkins")
          .select("wellbeing_score")
          .eq("id", inserted.id)
          .single();

        const currentWellbeing = current?.wellbeing_score ?? 50;
        const adjustedWellbeing = Math.min(100, Math.max(0, Number(currentWellbeing) + sentimentScore * 10));

        await supabase
          .from("checkins")
          .update({
            sentiment_score: sentimentScore,
            sentiment_label: sentimentLabel,
            wellbeing_score: adjustedWellbeing,
          })
          .eq("id", inserted.id);
      } catch (err) {
        console.error("Sentiment analysis failed:", err);
        // Non-blocking — don't prevent navigation
      } finally {
        setAnalyzingNote(false);
      }
    }

    setLoading(false);
    navigate("/app");
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

        {/* Notes (optional) */}
        <div className="rounded-lg bg-card p-4">
          <label className="mb-2 block text-sm font-medium text-foreground">
            ✏️ Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            rows={3}
            maxLength={NOTES_MAX}
            placeholder="How are you really feeling today? Any context helps..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-secondary text-foreground resize-none"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {notes.length}/{NOTES_MAX}
          </p>
        </div>

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

        <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="mt-2 h-14 w-full rounded-sm text-base font-semibold">
          {analyzingNote ? "Analyzing your note…" : loading ? "Saving…" : "Submit Check-In"}
        </Button>
      </div>
    </div>
  );
};

export default CheckIn;