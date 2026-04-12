import { useState } from "react";
import { analyzeSentiment } from "@/lib/gemini";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const TestGemini = () => {
  const [text, setText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const getLabel = (s: number) => {
    if (s > 0.3) return "Positive";
    if (s < -0.3) return "Negative";
    return "Neutral";
  };

  const handleTest = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setScore(null);
    try {
      const s = await analyzeSentiment(text);
      setScore(s);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gemini Sentiment Test</h1>
      <Textarea
        placeholder="Enter athlete journal text..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
      />
      <Button onClick={handleTest} disabled={loading || !text.trim()}>
        {loading ? "Analyzing..." : "Test Sentiment"}
      </Button>

      {error && <p className="text-destructive">{error}</p>}

      {score !== null && (
        <div className="rounded-lg bg-card p-4 space-y-2">
          <p className="text-foreground">
            <span className="font-semibold">Score:</span> {score.toFixed(2)}
          </p>
          <p className="text-foreground">
            <span className="font-semibold">Label:</span> {getLabel(score)}
          </p>
        </div>
      )}
    </div>
  );
};

export default TestGemini;
