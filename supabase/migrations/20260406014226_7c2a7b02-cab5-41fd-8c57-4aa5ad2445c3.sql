
-- Drop existing triggers
DROP TRIGGER IF EXISTS update_checkins_updated_at ON public.checkins;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing RLS policies on checkins
DROP POLICY IF EXISTS "Users can delete their own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.checkins;

-- Drop existing RLS policies on profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Drop existing tables
DROP TABLE IF EXISTS public.checkins;
DROP TABLE IF EXISTS public.profiles;

-- Create new profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  first_name text,
  last_name text,
  timezone text DEFAULT 'America/New_York',
  sport_type text,
  streak_count integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create new checkins table
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  hrv_rmssd numeric(6,2),
  soreness integer CHECK(soreness BETWEEN 1 AND 5),
  sleep_hours numeric(4,2),
  feeling integer CHECK(feeling BETWEEN 1 AND 5),
  trained_yesterday boolean DEFAULT false,
  sport text,
  training_intensity integer CHECK(training_intensity BETWEEN 1 AND 10),
  training_duration_min integer,
  hrv_score numeric(5,2),
  sleep_score numeric(5,2),
  soreness_score numeric(5,2),
  wellbeing_score numeric(5,2),
  recovery_score numeric(5,2),
  training_recommendation text,
  baseline_phase text,
  hrv_weight_applied numeric(4,2),
  lowest_factor text,
  source_hrv text DEFAULT 'MANUAL',
  source_sleep text DEFAULT 'MANUAL',
  is_backdated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Create baseline_cache table
CREATE TABLE public.baseline_cache (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  hrv_7d_mean_ln numeric(8,4),
  hrv_10d_mean_ln numeric(8,4),
  hrv_60d_mean_ln numeric(8,4),
  hrv_60d_std_ln numeric(8,4),
  sleep_30d_mean numeric(5,2),
  sleep_30d_std numeric(5,2),
  total_entries integer DEFAULT 0,
  consecutive_streak integer DEFAULT 0,
  baseline_phase text DEFAULT 'ONBOARDING',
  computed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "users own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "users own checkins" ON public.checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own baseline" ON public.baseline_cache FOR ALL USING (auth.uid() = user_id);

-- Updated handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

-- Recreate auth trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger on checkins
CREATE TRIGGER update_checkins_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
