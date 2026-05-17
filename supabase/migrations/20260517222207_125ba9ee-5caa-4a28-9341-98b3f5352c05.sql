-- Add HR zone breakdown + strain score to workouts
ALTER TABLE public.health_workouts
  ADD COLUMN IF NOT EXISTS avg_hr numeric,
  ADD COLUMN IF NOT EXISTS max_hr numeric,
  ADD COLUMN IF NOT EXISTS zone1_min numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone2_min numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone3_min numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone4_min numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone5_min numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strain numeric;

-- Optional user-set max HR (else estimated from age or default 190)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS max_hr integer,
  ADD COLUMN IF NOT EXISTS birth_year integer;

-- Daily aggregated strain (0–21 Whoop-style)
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS strain_score numeric;

-- Unique index needed for upsert onConflict above (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS health_workouts_unique
  ON public.health_workouts (user_id, source, start_at, activity_type);