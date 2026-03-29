-- ================================================================
-- NEXUS — Finanças: transações e metas financeiras
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ================================================================

-- ── TRANSAÇÕES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description      TEXT NOT NULL,
  amount           DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  type             TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category         TEXT NOT NULL DEFAULT 'outros',
  date             DATE NOT NULL,
  repeat_type      TEXT CHECK (repeat_type IN ('none', 'monthly')),
  installment_group UUID,
  installment_num  INTEGER,
  installment_total INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE update_transactions_updated_at();

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_own" ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── METAS FINANCEIRAS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_goals (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_amount  DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  deadline       DATE,
  color          TEXT DEFAULT '#6bcb77',
  icon           TEXT DEFAULT '🎯',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_financial_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER trg_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW EXECUTE PROCEDURE update_financial_goals_updated_at();

ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_goals_own" ON financial_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── ÍNDICES ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category   ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_inst_group ON transactions(installment_group);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
