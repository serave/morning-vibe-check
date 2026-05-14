
CREATE TABLE public.health_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sample_type TEXT NOT NULL CHECK (sample_type IN ('hrv_rmssd','sleep_hours','resting_hr')),
  value NUMERIC NOT NULL,
  entry_date DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('HEALTHKIT','HEALTH_CONNECT')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sample_type, entry_date, source)
);

CREATE INDEX idx_health_samples_user_date ON public.health_samples (user_id, entry_date DESC);

ALTER TABLE public.health_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own health_samples"
  ON public.health_samples FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.health_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('HEALTHKIT','HEALTH_CONNECT')),
  permissions_granted JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

ALTER TABLE public.health_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own health_connections"
  ON public.health_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_health_connections_updated_at
BEFORE UPDATE ON public.health_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
