import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ScoreSlider from "@/components/ScoreSlider";
import { useToast } from "@/hooks/use-toast";

interface CheckInProps {
  onComplete: () => void;
}

const CheckIn = ({ onComplete }: CheckInProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sleepHours, setSleepHours] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [feeling, setFeeling] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      entry_date: new Date().toISOString().split("T")[0],
      sleep_hours: sleepHours,
      soreness,
      feeling,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onComplete();
    }
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Good Morning 🌅</h1>
        <p className="text-sm text-muted-foreground">How are you feeling today?</p>
      </div>

      <div className="flex flex-col gap-3">
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

        <ScoreSlider label="Soreness" emoji="💪" value={soreness} onChange={setSoreness} lowLabel="None" highLabel="Very sore" min={1} max={5} />
        <ScoreSlider label="Feeling" emoji="😊" value={feeling} onChange={setFeeling} lowLabel="Terrible" highLabel="Great" min={1} max={5} />

        <Button onClick={handleSubmit} disabled={loading} className="mt-2 h-14 w-full rounded-sm text-base font-semibold">
          {loading ? "Saving…" : "Submit Check-In"}
        </Button>
      </div>
    </div>
  );
};

export default CheckIn;
