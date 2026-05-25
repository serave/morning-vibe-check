# Oura + Strava + PWA Install — 7 Step Plan

I'll track progress explicitly. After each step I'll tell you: **"Step X of 7 done. Next: Step Y."**

---

## Step 1 — Database: integrations table
Add `integrations` table to store per-user OAuth tokens (provider, access_token, refresh_token, expires_at, scope, athlete_id). RLS: users own their rows. Tokens stored encrypted-at-rest (Supabase default).

## Step 2 — Oura OAuth flow
- Create Oura developer app (you'll do this in browser, I'll guide you)
- Add `OURA_CLIENT_ID` + `OURA_CLIENT_SECRET` as secrets
- Edge functions: `oura-oauth-start`, `oura-oauth-callback`
- "Connect Oura" button on new `/app/connections` page

## Step 3 — Oura sync edge function
`sync-oura` function pulls daily: sleep, readiness, HRV, RHR, skin temp, activity → writes to `health_samples` + auto-populates today's `checkins` row (recovery_score, hrv_rmssd, sleep_hours, source_hrv='OURA', source_sleep='OURA'). Manual "Sync now" button + nightly cron.

## Step 4 — Strava OAuth flow
- Create Strava API app (I'll guide you)
- Add `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` as secrets
- Edge functions: `strava-oauth-start`, `strava-oauth-callback`
- "Connect Strava" button on `/app/connections`

## Step 5 — Strava sync edge function
`sync-strava` pulls recent activities → writes to `health_workouts` (type, duration, distance, HR avg/max, zones, computed strain). Manual "Sync now" + nightly cron. Optional webhook for real-time later.

## Step 6 — Connections settings page
Single `/app/connections` page showing: Oura status + last sync, Strava status + last sync, connect/disconnect/sync buttons. Add link from main nav.

## Step 7 — PWA installable (no service worker)
Add `manifest.json` + icons + Apple touch meta tags → iPhone install via Safari Share → Add to Home Screen. **No `vite-plugin-pwa`, no service worker** (avoids preview-cache issues and keeps Capacitor path open for later).

---

## Deferred (not in this plan)
- Capacitor + Apple HealthKit native build (do later when you have Mac access)
- Strava webhooks (cron is fine for daily testing)
- RunGap (already pushes to Strava, so covered)

## Technical notes
- Token refresh handled inside each sync function before API calls
- Cron jobs use `pg_cron` + `pg_net`, scheduled per-user at 5am local
- All edge functions use Zod input validation + CORS
- Existing illness detection, target strain, sleep need automatically benefit once Oura data flows in

**I'll start with Step 1 as soon as you approve.**
