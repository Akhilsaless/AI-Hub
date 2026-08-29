CREATE TABLE IF NOT EXISTS hope_agent_registry(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  tools TEXT NOT NULL DEFAULT '[]',
  required_permissions TEXT NOT NULL DEFAULT '[]',
  supported_tasks TEXT NOT NULL DEFAULT '[]',
  preferred_model_profile TEXT NOT NULL DEFAULT 'balanced',
  maximum_execution_ms INTEGER NOT NULL DEFAULT 30000,
  maximum_cost_credits INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  health TEXT NOT NULL DEFAULT 'healthy',
  last_execution_at TEXT,
  execution_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  total_latency_ms INTEGER NOT NULL DEFAULT 0,
  quality_score REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hope_orchestration_runs(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  thread_id TEXT,
  objective TEXT NOT NULL,
  complexity TEXT NOT NULL,
  status TEXT NOT NULL,
  planned_agents INTEGER NOT NULL DEFAULT 0,
  used_agents INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hope_orchestration_tasks(
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  sequence_group INTEGER NOT NULL DEFAULT 0,
  depends_on TEXT NOT NULL DEFAULT '[]',
  tool TEXT,
  started_at TEXT,
  completed_at TEXT,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  error TEXT,
  quality_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES hope_orchestration_runs(id),
  FOREIGN KEY(agent_id) REFERENCES hope_agent_registry(id)
);

CREATE INDEX IF NOT EXISTS idx_hope_orchestration_runs_user ON hope_orchestration_runs(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_hope_orchestration_tasks_run ON hope_orchestration_tasks(run_id,sequence_group,status);
