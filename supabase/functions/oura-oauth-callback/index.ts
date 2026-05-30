import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyState(state: string, secret: string): Promise<{ userId: string; returnTo: string } | null> {
  try {
    const [b64payload, sig] = state.split(".");
    if (!b64payload || !sig) return null;
    const padded = b64payload + "=".repeat((4 - (b64payload.length % 4)) % 4);
    const payload = atob(padded);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (expectedB64 !== sig) return null;
    const [userId, _nonce, tsStr, returnToEnc] = payload.split("|");
    if (Date.now() - Number(tsStr) > 10 * 60 * 1000) return null;
    return { userId, returnTo: decodeURIComponent(returnToEnc || "") };
  } catch {
    return null;
  }
}

function htmlRedirect(to: string, msg: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Oura</title></head><body>
     <script>window.location.replace(${JSON.stringify(to)});</script>
     <p>${msg} <a href="${to}">Continue</a></p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const fallback = "/app/connect-health?oura=error";
  if (error) return htmlRedirect(fallback + "&reason=" + encodeURIComponent(error), "Authorization denied.");
  if (!code || !state) return htmlRedirect(fallback, "Missing code or state.");

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const verified = await verifyState(state, serviceKey);
  if (!verified) return htmlRedirect(fallback + "&reason=bad_state", "Invalid state.");

  const clientId = Deno.env.get("OURA_CLIENT_ID")!;
  const clientSecret = Deno.env.get("OURA_CLIENT_SECRET")!;
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oura-oauth-callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    console.error("Oura token exchange failed:", tokenRes.status, txt);
    return htmlRedirect(fallback + "&reason=token_exchange", "Token exchange failed.");
  }
  const tokens = await tokenRes.json();

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : null;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { error: upsertErr } = await admin
    .from("integrations")
    .upsert({
      user_id: verified.userId,
      provider: "oura",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      metadata: { token_type: tokens.token_type ?? "Bearer" },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

  if (upsertErr) {
    console.error("Upsert failed:", upsertErr);
    return htmlRedirect(fallback + "&reason=db", "Could not save tokens.");
  }

  const base = verified.returnTo || "https://morning-vibe-check.lovable.app/app/connect-health";
  const sep = base.includes("?") ? "&" : "?";
  const dest = `${base}${sep}oura=connected`;
  return htmlRedirect(dest, "Oura connected. Redirecting…");
});
