-- Calendario Supabase Schema — idempotent (safe to run multiple times)
-- Run in: Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. Create tables
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  description TEXT DEFAULT '',
  repeat_type TEXT DEFAULT 'none' CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly')),
  tag_id BIGINT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ============================================================
-- 3. Enable RLS
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Clean old policies/triggers/columns
-- ============================================================
DROP POLICY IF EXISTS "Users can manage their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage their tags" ON tags;
DROP POLICY IF EXISTS "tasks_owner" ON tasks;
DROP POLICY IF EXISTS "tags_owner" ON tags;
DROP POLICY IF EXISTS "tasks_device" ON tasks;
DROP POLICY IF EXISTS "tags_device" ON tags;
DROP TRIGGER IF EXISTS trg_tasks_user_id ON tasks;
DROP TRIGGER IF EXISTS trg_tags_user_id ON tags;
DROP FUNCTION IF EXISTS set_user_id();
ALTER TABLE tasks DROP COLUMN IF EXISTS device_id;
ALTER TABLE tags DROP COLUMN IF EXISTS device_id;

-- ============================================================
-- 5. Policies
-- ============================================================
CREATE POLICY "tasks_owner" ON tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tags_owner" ON tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. Realtime
-- ============================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tags; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
