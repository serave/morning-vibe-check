import { useState } from "react";
import { analyzeSentiment } from "@/lib/gemini";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const TestGemini = () => {
  const [text, setText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [rawResponse, setRawResponse] = useState<string>("");
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
    setRawResponse("");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_AI_STUDIO}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `You are analyzing an athlete wellness journal entry for sentiment.\nReturn ONLY a valid JSON object with exactly one field called "score".\nThe score must be a number from -1.0 (very negative/unwell) to 1.0 (very positive/great).\nNo explanation. No markdown. Just the JSON.\nExample output: {"score": 0.4}\nText to analyze: "${text}"` }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
          }),
        }
      );
      const data = await res.json();
      setRawResponse(JSON.stringify(data, null, 2));
      const raw = data.candidates[0].content.parts[0].text.trim();
      const parsed = JSON.parse(raw);
      const s = Math.min(1, Math.max(-1, parsed.score));
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

      {rawResponse && (
        <div className="rounded-lg bg-card p-4">
          <p className="font-semibold text-foreground mb-2">Raw API Response:</p>
          <pre className="text-xs text-muted-foreground overflow-auto max-h-64 whitespace-pre-wrap">
            {rawResponse}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestGemini;
