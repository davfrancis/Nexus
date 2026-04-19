CREATE TABLE IF NOT EXISTS learning_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users NOT NULL,
  type          text NOT NULL CHECK (type IN ('book','course','video','podcast','article')),
  title         text NOT NULL,
  author        text,
  platform      text,
  status        text NOT NULL DEFAULT 'wishlist' CHECK (status IN ('wishlist','in_progress','completed','paused')),
  progress_pct  integer NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  total_units   integer,
  current_unit  integer,
  rating        integer CHECK (rating >= 1 AND rating <= 5),
  notes         text,
  category      text,
  started_at    date,
  completed_at  date,
  cover_emoji   text NOT NULL DEFAULT '📚',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE learning_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own learning items" ON learning_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_learning_items_user   ON learning_items(user_id);
CREATE INDEX idx_learning_items_status ON learning_items(user_id, status);
