CREATE TABLE IF NOT EXISTS public.health_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT,
  activity_type TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_min NUMERIC,
  energy_kcal NUMERIC,
  distance_m NUMERIC,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS health_workouts_dedup
  ON public.health_workouts (user_id, source, start_at, activity_type);

CREATE INDEX IF NOT EXISTS health_workouts_user_date
  ON public.health_workouts (user_id, entry_date DESC);

ALTER TABLE public.health_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own health_workouts"
  ON public.health_workouts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
