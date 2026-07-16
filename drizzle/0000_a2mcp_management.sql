CREATE TABLE IF NOT EXISTS tool_configs (
  name TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  paid INTEGER NOT NULL DEFAULT 1,
  price TEXT NOT NULL,
  price_label TEXT NOT NULL,
  scheme TEXT NOT NULL,
  network TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY NOT NULL,
  tool_name TEXT NOT NULL,
  paid INTEGER NOT NULL,
  status TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  price TEXT,
  network TEXT,
  pay_to TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS call_logs_created_at_idx ON call_logs (created_at);
CREATE INDEX IF NOT EXISTS call_logs_tool_name_idx ON call_logs (tool_name);

INSERT OR IGNORE INTO tool_configs (
  name,
  enabled,
  paid,
  price,
  price_label,
  scheme,
  network,
  pay_to,
  updated_at
) VALUES
  (
    'ctbz_draw_questions',
    1,
    1,
    '$0.05',
    '0.05 USDT',
    'exact',
    'eip155:196',
    '0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d',
    '2026-07-07T00:00:00.000Z'
  ),
  (
    'ctbz_score_assessment',
    1,
    1,
    '$0.05',
    '0.05 USDT',
    'exact',
    'eip155:196',
    '0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d',
    '2026-07-07T00:00:00.000Z'
  );
