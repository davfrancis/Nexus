-- ================================================================
-- NEXUS — Schema completo do banco de dados
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ================================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES (estende auth.users) ───────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT,
  avatar_url  TEXT,
  timezone    TEXT DEFAULT 'America/Sao_Paulo',
  google_access_token  TEXT,
  google_refresh_token TEXT,
  google_token_expiry  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TAREFAS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'work',   -- work | personal | gym | study | urgent
  priority    TEXT DEFAULT 'medium', -- high | medium | low
  status      TEXT DEFAULT 'todo',   -- todo | doing | done
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── EVENTOS / AGENDA ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT DEFAULT 'work',
  event_date      DATE NOT NULL,
  start_time      TIME,
  end_time        TIME,
  recurrence      TEXT DEFAULT 'none', -- none | daily | weekly | monthly
  gcal_event_id   TEXT,                -- ID do evento no Google Calendar
  gcal_calendar_id TEXT,
  source          TEXT DEFAULT 'local', -- local | gcal
  color           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── HÁBITOS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '⭐',
  color       TEXT DEFAULT 'accent',
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Registro diário dos hábitos
CREATE TABLE IF NOT EXISTS habit_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id    UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date    DATE NOT NULL,
  completed   BOOLEAN DEFAULT FALSE,
  UNIQUE(habit_id, log_date)
);

-- ── ACADEMIA ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '💪',
  muscle_group TEXT,
  day_of_week INTEGER NOT NULL, -- 0=Dom...6=Sáb
  sets        INTEGER DEFAULT 3,
  reps        INTEGER DEFAULT 10,
  weight_kg   NUMERIC(6,2) DEFAULT 0,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Séries completadas por sessão
CREATE TABLE IF NOT EXISTS workout_sets (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exercise_id  UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_date DATE NOT NULL,
  set_number   INTEGER NOT NULL,
  reps_done    INTEGER,
  weight_done  NUMERIC(6,2),
  completed    BOOLEAN DEFAULT FALSE,
  UNIQUE(exercise_id, workout_date, set_number)
);

-- Recordes pessoais
CREATE TABLE IF NOT EXISTS personal_records (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  weight_kg   NUMERIC(6,2) NOT NULL,
  reps        INTEGER,
  recorded_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, exercise_name)
);

-- ── PROJETOS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  client      TEXT,
  description TEXT,
  color       TEXT DEFAULT 'accent',
  tags        TEXT[] DEFAULT '{}',
  progress    INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status      TEXT DEFAULT 'active', -- active | paused | done | archived
  deadline    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTAS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT,
  tag         TEXT DEFAULT 'personal', -- work | personal | study | gym
  pinned      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── SAÚDE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_logs (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  water_ml     INTEGER DEFAULT 0,
  water_goal   INTEGER DEFAULT 2000,
  sleep_hours  NUMERIC(4,1),
  steps        INTEGER DEFAULT 0,
  mood         TEXT,   -- 😄 | 🙂 | 😐 | 😴 | 😔
  mood_label   TEXT,
  energy       INTEGER CHECK (energy BETWEEN 1 AND 10),
  stress       INTEGER CHECK (stress BETWEEN 1 AND 10),
  motivation   INTEGER CHECK (motivation BETWEEN 1 AND 10),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- ── SESSÕES DE FOCO (POMODORO) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS focus_sessions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id      UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_label   TEXT,
  mode         TEXT DEFAULT 'focus', -- focus | short | long
  duration_min INTEGER NOT NULL,
  completed    BOOLEAN DEFAULT TRUE,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  ended_at     TIMESTAMPTZ
);

-- ================================================================
-- ROW LEVEL SECURITY — cada user vê só os próprios dados
-- ================================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions     ENABLE ROW LEVEL SECURITY;

-- Políticas (padrão: user vê/edita apenas seus próprios dados)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tasks','events','habits','habit_logs','exercises',
    'workout_sets','personal_records','projects','notes',
    'health_logs','focus_sessions'
  ] LOOP
    EXECUTE format('
      CREATE POLICY "%s_select" ON %s FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "%s_insert" ON %s FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "%s_update" ON %s FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "%s_delete" ON %s FOR DELETE USING (auth.uid() = user_id);
    ', tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ================================================================
-- TRIGGERS — auto updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_updated    BEFORE UPDATE ON tasks    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated   BEFORE UPDATE ON events   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notes_updated    BEFORE UPDATE ON notes    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- FUNÇÃO — cria profile automaticamente ao registrar
-- ================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- ÍNDICES para performance
-- ================================================================

CREATE INDEX idx_tasks_user      ON tasks(user_id, status);
CREATE INDEX idx_events_user     ON events(user_id, event_date);
CREATE INDEX idx_habit_logs_user ON habit_logs(user_id, log_date);
CREATE INDEX idx_health_user     ON health_logs(user_id, log_date DESC);
CREATE INDEX idx_focus_user      ON focus_sessions(user_id, started_at DESC);
CREATE INDEX idx_workout_user    ON workout_sets(user_id, workout_date DESC);
