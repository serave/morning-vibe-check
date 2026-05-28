import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OURA = "https://api.ouraring.com";

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function refreshIfNeeded(integration: any, admin: any) {
  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0;
  // refresh if expiring within 5 min
  if (expiresAt - Date.now() > 5 * 60 * 1000) return integration.access_token;
  if (!integration.refresh_token) return integration.access_token;

  const res = await fetch(`${OURA}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
      client_id: Deno.env.get("OURA_CLIENT_ID")!,
      client_secret: Deno.env.get("OURA_CLIENT_SECRET")!,
    }),
  });
  if (!res.ok) {
    console.error("Oura refresh failed", res.status, await res.text());
    return integration.access_token;
  }
  const tok = await res.json();
  const newExpires = tok.expires_in
    ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
    : integration.expires_at;
  await admin.from("integrations").update({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? integration.refresh_token,
    expires_at: newExpires,
    updated_at: new Date().toISOString(),
  }).eq("id", integration.id);
  return tok.access_token;
}

async function ouraGet(path: string, token: string, params: Record<string, string>) {
  const url = new URL(`${OURA}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Oura ${path} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: integration, error: iErr } = await admin
      .from("integrations").select("*")
      .eq("user_id", user.id).eq("provider", "oura").maybeSingle();
    if (iErr) throw iErr;
    if (!integration) {
      return new Response(JSON.stringify({ error: "Oura not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body?.days) || 14, 1), 60);

    const token = await refreshIfNeeded(integration, admin);

    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - days);
    const startD = dateStr(start);
    const endD = dateStr(end);

    // Pull in parallel
    const [sleep, dailySleep, readiness, activity, workouts] = await Promise.all([
      ouraGet("/v2/usercollection/sleep", token, { start_date: startD, end_date: endD }),
      ouraGet("/v2/usercollection/daily_sleep", token, { start_date: startD, end_date: endD }),
      ouraGet("/v2/usercollection/daily_readiness", token, { start_date: startD, end_date: endD }),
      ouraGet("/v2/usercollection/daily_activity", token, { start_date: startD, end_date: endD }),
      ouraGet("/v2/usercollection/workout", token, { start_date: startD, end_date: endD }),
    ]);

    // Aggregate per day from main sleep periods only
    type DayAgg = { hrv?: number; sleepHrs?: number; rhr?: number };
    const byDay = new Map<string, DayAgg>();
    for (const s of sleep.data ?? []) {
      if (s.type && s.type !== "long_sleep" && s.type !== "sleep") continue;
      const day = s.day as string;
      const agg = byDay.get(day) ?? {};
      if (typeof s.average_hrv === "number") agg.hrv = s.average_hrv;
      if (typeof s.total_sleep_duration === "number") agg.sleepHrs = s.total_sleep_duration / 3600;
      if (typeof s.lowest_heart_rate === "number") agg.rhr = s.lowest_heart_rate;
      byDay.set(day, agg);
    }

    // Build sample rows
    const samples: any[] = [];
    for (const [day, a] of byDay) {
      if (a.hrv != null) samples.push({ user_id: user.id, sample_type: "hrv_rmssd", value: a.hrv, entry_date: day, source: "OURA" });
      if (a.sleepHrs != null) samples.push({ user_id: user.id, sample_type: "sleep_hours", value: Number(a.sleepHrs.toFixed(2)), entry_date: day, source: "OURA" });
      if (a.rhr != null) samples.push({ user_id: user.id, sample_type: "resting_hr", value: a.rhr, entry_date: day, source: "OURA" });
    }

    let samplesUpserted = 0;
    if (samples.length) {
      const { error } = await admin.from("health_samples").upsert(samples, {
        onConflict: "user_id,sample_type,entry_date,source",
      });
      if (error) throw error;
      samplesUpserted = samples.length;
    }

    // Workouts
    const workoutRows = (workouts.data ?? []).map((w: any) => ({
      user_id: user.id,
      source: "OURA",
      external_id: w.id,
      activity_type: w.activity ?? "workout",
      start_at: w.start_datetime,
      end_at: w.end_datetime,
      duration_min: w.start_datetime && w.end_datetime
        ? (new Date(w.end_datetime).getTime() - new Date(w.start_datetime).getTime()) / 60000
        : null,
      energy_kcal: w.calories ?? null,
      distance_m: w.distance ?? null,
      entry_date: w.day,
    }));
    let workoutsUpserted = 0;
    if (workoutRows.length) {
      const { error } = await admin.from("health_workouts").upsert(workoutRows, {
        onConflict: "user_id,source,start_at,activity_type",
      });
      if (error) throw error;
      workoutsUpserted = workoutRows.length;
    }

    // Auto-populate today's checkin (only fields not yet set)
    const today = dateStr(new Date());
    const todayAgg = byDay.get(today);
    let checkinUpdated = false;
    if (todayAgg && (todayAgg.hrv != null || todayAgg.sleepHrs != null)) {
      const { data: existing } = await admin
        .from("checkins").select("id,hrv_rmssd,sleep_hours,source_hrv,source_sleep")
        .eq("user_id", user.id).eq("entry_date", today).maybeSingle();

      const patch: any = {};
      if (todayAgg.hrv != null && (!existing || existing.hrv_rmssd == null || existing.source_hrv !== "MANUAL")) {
        patch.hrv_rmssd = todayAgg.hrv;
        patch.source_hrv = "OURA";
      }
      if (todayAgg.sleepHrs != null && (!existing || existing.sleep_hours == null || existing.source_sleep !== "MANUAL")) {
        patch.sleep_hours = Number(todayAgg.sleepHrs.toFixed(2));
        patch.source_sleep = "OURA";
      }
      if (Object.keys(patch).length) {
        if (existing) {
          await admin.from("checkins").update(patch).eq("id", existing.id);
        } else {
          await admin.from("checkins").insert({ user_id: user.id, entry_date: today, ...patch });
        }
        checkinUpdated = true;
      }
    }

    await admin.from("integrations").update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", integration.id);

    return new Response(JSON.stringify({
      ok: true,
      days,
      samplesUpserted,
      workoutsUpserted,
      checkinUpdated,
      dailySleep: dailySleep.data?.length ?? 0,
      readiness: readiness.data?.length ?? 0,
      activity: activity.data?.length ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("sync-oura error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
