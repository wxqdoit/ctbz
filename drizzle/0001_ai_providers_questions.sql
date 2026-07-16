CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  note TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_providers_status_idx ON ai_providers (status);
CREATE INDEX IF NOT EXISTS ai_providers_sort_order_idx ON ai_providers (sort_order);

CREATE TABLE IF NOT EXISTS managed_questions (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  attribute TEXT NOT NULL,
  dimension TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weights_json TEXT NOT NULL,
  options_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS managed_questions_enabled_idx ON managed_questions (enabled);
CREATE INDEX IF NOT EXISTS managed_questions_sort_order_idx ON managed_questions (sort_order);
