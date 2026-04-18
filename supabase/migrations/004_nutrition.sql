-- Tabela de registros de alimentos por dia
CREATE TABLE IF NOT EXISTS food_logs (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date      DATE NOT NULL,
  food_name     TEXT NOT NULL,
  portion_g     DECIMAL(8,1) NOT NULL DEFAULT 100,
  calories_kcal DECIMAL(8,1) NOT NULL DEFAULT 0,
  protein_g     DECIMAL(8,1) NOT NULL DEFAULT 0,
  carbs_g       DECIMAL(8,1) NOT NULL DEFAULT 0,
  fat_g         DECIMAL(8,1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_logs_user_all" ON food_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS food_logs_user_date ON food_logs(user_id, log_date);
