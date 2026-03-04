
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  off_work_time TEXT NOT NULL DEFAULT '18:00',
  streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  dark_mode BOOLEAN NOT NULL DEFAULT true,
  last_login_date TEXT,
  consecutive_login_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL DEFAULT '파이리',
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 80,
  max_hp INTEGER NOT NULL DEFAULT 100,
  happiness REAL NOT NULL DEFAULT 3,
  stage TEXT NOT NULL DEFAULT 'charmander',
  food_count INTEGER NOT NULL DEFAULT 0,
  total_food_collected INTEGER NOT NULL DEFAULT 0,
  last_hp_decay TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet" ON public.pets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Collections table (coins, seen/encountered species)
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  coins INTEGER NOT NULL DEFAULT 0,
  seen_species_ids INTEGER[] NOT NULL DEFAULT '{}',
  encountered_species_ids INTEGER[] NOT NULL DEFAULT '{}',
  starter_chosen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collection" ON public.collections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Owned Pokemon
CREATE TABLE public.owned_pokemon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  species_id INTEGER NOT NULL,
  nickname TEXT,
  friendship INTEGER NOT NULL DEFAULT 70,
  level INTEGER NOT NULL DEFAULT 1,
  acquired_date TEXT NOT NULL DEFAULT '',
  acquired_method TEXT NOT NULL DEFAULT 'encounter',
  is_in_party BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, uid)
);

ALTER TABLE public.owned_pokemon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pokemon" ON public.owned_pokemon
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pokemon Eggs
CREATE TABLE public.pokemon_eggs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  egg_id TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  distance_walked REAL NOT NULL DEFAULT 0,
  distance_required REAL NOT NULL DEFAULT 2,
  hatched BOOLEAN NOT NULL DEFAULT false,
  hatched_species_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, egg_id)
);

ALTER TABLE public.pokemon_eggs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own eggs" ON public.pokemon_eggs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Running Stats
CREATE TABLE public.running_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_distance_km REAL NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  best_pace_min_per_km REAL,
  longest_run_km REAL NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  goals JSONB NOT NULL DEFAULT '[]',
  challenges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.running_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own running stats" ON public.running_stats
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Running Sessions
CREATE TABLE public.running_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  distance_km REAL NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  pace_min_per_km REAL NOT NULL DEFAULT 0,
  route JSONB NOT NULL DEFAULT '[]',
  calories_burned INTEGER NOT NULL DEFAULT 0,
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.running_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions" ON public.running_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Battle Records
CREATE TABLE public.battle_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  battle_id TEXT NOT NULL,
  battle_date TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  result TEXT NOT NULL,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  exp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.battle_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own battle records" ON public.battle_records
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inventory
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  items JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own inventory" ON public.inventory
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pokemon Health
CREATE TABLE public.pokemon_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  injuries JSONB NOT NULL DEFAULT '{}',
  last_heal_all_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pokemon_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own health data" ON public.pokemon_health
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Legendary State
CREATE TABLE public.legendary_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  caught INTEGER[] NOT NULL DEFAULT '{}',
  encounters INTEGER NOT NULL DEFAULT 0,
  last_encounter_date TEXT,
  weekly_goal_streak_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legendary_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own legendary state" ON public.legendary_state
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Catch Quests
CREATE TABLE public.catch_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  active_quests JSONB NOT NULL DEFAULT '[]',
  completed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catch_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quests" ON public.catch_quests
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
