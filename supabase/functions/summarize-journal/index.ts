import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { period } = await req.json().catch(() => ({ period: "week" }));
    const days = period === "month" ? 30 : 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const { data: checkins, error: ciErr } = await supabase
      .from("checkins")
      .select("entry_date, recovery_score, hrv_rmssd, sleep_hours, soreness, feeling, strain_score, notes, sentiment_score")
      .eq("user_id", user.id)
      .gte("entry_date", cutoffStr)
      .order("entry_date", { ascending: true });

    if (ciErr) throw ciErr;

    if (!checkins || checkins.length < 2) {
      return new Response(JSON.stringify({ summary: null, message: "Need at least 2 check-ins in this period to generate a summary." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = checkins.map((c: any) => {
      const parts = [
        c.entry_date,
        c.recovery_score != null ? `recovery=${Math.round(c.recovery_score)}` : null,
        c.hrv_rmssd != null ? `hrv=${Math.round(c.hrv_rmssd)}` : null,
        c.sleep_hours != null ? `sleep=${Number(c.sleep_hours).toFixed(1)}h` : null,
        c.soreness != null ? `sore=${c.soreness}/5` : null,
        c.feeling != null ? `feel=${c.feeling}/5` : null,
        c.strain_score != null ? `strain=${Number(c.strain_score).toFixed(1)}` : null,
        c.notes ? `notes="${String(c.notes).replace(/\s+/g, " ").slice(0, 200)}"` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    }).join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an athlete performance coach. Analyze ${days}-day check-in data and journal notes. Return a concise, encouraging summary with concrete observations and 2-3 actionable suggestions. Use markdown with these sections:
**Overview** (1-2 sentences)
**What went well** (bullets)
**Watch-outs** (bullets)
**Suggestions for next ${period === "month" ? "month" : "week"}** (2-3 bullets)
Reference specific patterns from the data. Be direct, not generic.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Period: last ${days} days (${checkins.length} check-ins)\n\nData:\n${lines}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      const status = aiRes.status === 402 || aiRes.status === 429 ? aiRes.status : 502;
      const msg = aiRes.status === 402
        ? "AI credits exhausted. Please add funds to your workspace."
        : aiRes.status === 429
          ? "AI rate limit reached. Try again shortly."
          : `AI gateway error (${aiRes.status})`;
      console.error("AI gateway error:", aiRes.status, errBody);
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const summary = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ summary, period, days, count: checkins.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("summarize-journal error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
