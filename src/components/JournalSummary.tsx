import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";

type Period = "week" | "month";

const renderMarkdown = (md: string): string => {
  // Lightweight inline renderer: bold, bullets, paragraphs
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html += '<ul class="ml-4 list-disc space-y-1 text-sm text-foreground/90">'; inList = true; }
      html += `<li>${formatInline(line.slice(2))}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p class="text-sm text-foreground/90 mt-2">${formatInline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
};

const formatInline = (s: string): string =>
  s.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>');

const JournalSummary = () => {
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setMessage(null);
    setCount(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("summarize-journal", {
        body: { period },
      });
      if (invokeErr) throw new Error(invokeErr.message);
      if (data?.error) throw new Error(data.error);
      if (data?.summary) {
        setSummary(data.summary);
        setCount(data.count ?? null);
      } else {
        setMessage(data?.message ?? "No summary available.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Journal Summary
        </h2>
        <div className="flex gap-1">
          {(["week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {p === "week" ? "7D" : "30D"}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing your {period}...
          </>
        ) : (
          <>Generate {period === "week" ? "weekly" : "monthly"} summary</>
        )}
      </button>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}

      {summary && (
        <div className="mt-4 rounded-md border border-border/50 bg-background/40 p-3">
          {count != null && (
            <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              Based on {count} check-in{count === 1 ? "" : "s"}
            </p>
          )}
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }} />
        </div>
      )}
    </div>
  );
};

export default JournalSummary;
